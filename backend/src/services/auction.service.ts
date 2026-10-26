import { ResultSetHeader, RowDataPacket, PoolConnection } from 'mysql2/promise';
import { pool, withTransaction } from '../config/db';
import { AuctionStatus } from '../models/auction.model';
import { ApiError } from '../utils/ApiError';
import { NotificationService } from './notification.service';

interface LockRow extends RowDataPacket {
  id: number; product_id: number; starting_price: number; current_highest_bid: number | null;
  highest_bidder_id: number | null; start_time: Date; end_time: Date; status: AuctionStatus;
  started: number; not_ended: number; product_name: string;
}

const money = (n: number) => `$${Number(n).toFixed(2)}`;
const isLive = (a: LockRow) => a.status === 'UPCOMING' || a.status === 'ACTIVE';

/**
 * Locks the auction row for the rest of the transaction. Every bid, finalization, edit and cancel goes
 * through this lock, so they run one at a time per auction. "started"/"not_ended" are computed with the
 * DATABASE clock (NOW()), never the client's or Node's.
 */
async function lockAuction(conn: PoolConnection, id: number): Promise<LockRow | null> {
  const [rows] = await conn.query<LockRow[]>(
    `SELECT a.*, (a.start_time <= NOW()) AS started, (a.end_time > NOW()) AS not_ended, p.name AS product_name
       FROM auctions a JOIN products p ON p.id = a.product_id
      WHERE a.id = ? FOR UPDATE OF a`, [id]);
  return rows[0] ?? null;
}

async function assertProductFree(conn: PoolConnection, productId: number, exceptAuctionId = 0) {
  const [p] = await conn.query<RowDataPacket[]>('SELECT id, is_available FROM products WHERE id = ? FOR UPDATE', [productId]);
  if (!p[0]) throw ApiError.badRequest('Selected product does not exist.');
  const [live] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM auctions WHERE product_id = ? AND id <> ? AND status IN ('UPCOMING','ACTIVE') AND end_time > NOW() LIMIT 1`,
    [productId, exceptAuctionId]);
  if (live[0]) throw ApiError.conflict('This product already has an upcoming or active auction.');
}

/** Ends a (locked, due) auction: picks the highest bid, creates the winner's order, notifies everyone. */
async function finalizeLocked(conn: PoolConnection, a: LockRow): Promise<void> {
  const [top] = await conn.query<RowDataPacket[]>(
    'SELECT id, user_id, amount FROM bids WHERE auction_id = ? ORDER BY amount DESC, id ASC LIMIT 1', [a.id]);
  const win = top[0];
  if (!win) {
    await conn.query("UPDATE auctions SET status = 'ENDED' WHERE id = ?", [a.id]); // nobody bid
    return;
  }

  await conn.query(
    `UPDATE auctions SET status = 'ENDED', winner_id = ?, winning_bid = ?, current_highest_bid = ?, highest_bidder_id = ? WHERE id = ?`,
    [win.user_id, win.amount, win.amount, win.user_id, a.id]);

  // Order for the winner (UNIQUE(auction_id) guarantees only one, even if finalization ever ran twice).
  const [u] = await conn.query<RowDataPacket[]>('SELECT address FROM users WHERE id = ?', [win.user_id]);
  const [order] = await conn.query<ResultSetHeader>(
    `INSERT INTO orders (user_id, auction_id, total_amount, status, payment_status, shipping_address)
     VALUES (?, ?, ?, 'PENDING', 'PENDING', ?)`, [win.user_id, a.id, win.amount, u[0]?.address ?? '']);
  await conn.query(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, 1, ?, ?)',
    [order.insertId, a.product_id, win.amount, win.amount]);

  await NotificationService.create(conn, {
    userId: win.user_id, type: 'AUCTION_WON', title: 'You won the auction!',
    body: `You won "${a.product_name}" with a winning bid of ${money(win.amount)}.`,
    relatedType: 'AUCTION', relatedId: a.id,
  });

  // Congratulations message from the admin (appears in the winner's Messages).
  const [admin] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
  if (admin[0]) {
    await conn.query(
      'INSERT INTO messages (sender_id, receiver_id, subject, message) VALUES (?, ?, ?, ?)',
      [admin[0].id, win.user_id, 'Congratulations! You won the auction',
       `Congratulations!\n\nYou won the auction for "${a.product_name}"\nwith a winning bid of ${money(win.amount)}.\n\nPlease check your account for the next steps.`]);
  }

  const [losers] = await conn.query<RowDataPacket[]>(
    'SELECT DISTINCT user_id FROM bids WHERE auction_id = ? AND user_id <> ?', [a.id, win.user_id]);
  for (const l of losers) {
    await NotificationService.create(conn, {
      userId: l.user_id, type: 'AUCTION_LOST', title: 'Auction ended',
      body: `The auction for "${a.product_name}" has ended. Unfortunately you didn't win this time.`,
      relatedType: 'AUCTION', relatedId: a.id,
    });
  }
}

export interface NewAuction { productId: number; startingPrice: number; startTime: Date; endTime: Date }

export const AuctionService = {
  create(input: NewAuction): Promise<number> {
    return withTransaction(async conn => {
      await assertProductFree(conn, input.productId);
      const status: AuctionStatus = input.startTime.getTime() <= Date.now() ? 'ACTIVE' : 'UPCOMING';
      const [r] = await conn.query<ResultSetHeader>(
        `INSERT INTO auctions (product_id, starting_price, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)`,
        [input.productId, input.startingPrice, input.startTime, input.endTime, status]);
      return r.insertId;
    });
  },

  /** Before the start everything is editable; once started only the end time can be extended. */
  update(id: number, patch: Partial<NewAuction>): Promise<void> {
    return withTransaction(async conn => {
      const a = await lockAuction(conn, id);
      if (!a) throw ApiError.notFound('Auction not found.');
      if (!isLive(a) || !a.not_ended) throw ApiError.conflict('This auction has already ended or was cancelled.');

      if (a.started && (patch.productId !== undefined || patch.startingPrice !== undefined || patch.startTime !== undefined)) {
        throw ApiError.conflict('Once an auction has started, only its end time can be changed.');
      }
      const productId = patch.productId ?? a.product_id;
      const startTime = patch.startTime ?? a.start_time;
      const endTime = patch.endTime ?? a.end_time;
      if (endTime <= startTime) throw new ApiError(422, 'End time must be after the start time.');
      if (endTime.getTime() <= Date.now() + 60_000) throw new ApiError(422, 'End time must be in the future.');
      if (productId !== a.product_id) await assertProductFree(conn, productId, id);

      const status: AuctionStatus = startTime.getTime() <= Date.now() ? 'ACTIVE' : 'UPCOMING';
      await conn.query(
        'UPDATE auctions SET product_id = ?, starting_price = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
        [productId, patch.startingPrice ?? a.starting_price, startTime, endTime, status, id]);
    });
  },

  /** Deleting is only allowed while there are no bids (otherwise cancel, so history is kept). */
  remove(id: number): Promise<void> {
    return withTransaction(async conn => {
      const a = await lockAuction(conn, id);
      if (!a) throw ApiError.notFound('Auction not found.');
      const [b] = await conn.query<RowDataPacket[]>('SELECT id FROM bids WHERE auction_id = ? LIMIT 1', [id]);
      if (b[0]) throw ApiError.conflict('This auction has bids and cannot be deleted. Cancel it instead.');
      await conn.query('DELETE FROM auctions WHERE id = ?', [id]);
    });
  },

  cancel(id: number): Promise<void> {
    return withTransaction(async conn => {
      const a = await lockAuction(conn, id);
      if (!a) throw ApiError.notFound('Auction not found.');
      if (!isLive(a) || !a.not_ended) throw ApiError.conflict('This auction has already ended or was cancelled.');
      await conn.query("UPDATE auctions SET status = 'CANCELLED' WHERE id = ?", [id]);
      const [bidders] = await conn.query<RowDataPacket[]>('SELECT DISTINCT user_id FROM bids WHERE auction_id = ?', [id]);
      for (const b of bidders) {
        await NotificationService.create(conn, {
          userId: b.user_id, type: 'GENERAL', title: 'Auction cancelled',
          body: `The auction for "${a.product_name}" was cancelled. Your bids will not be charged.`,
          relatedType: 'AUCTION', relatedId: id,
        });
      }
    });
  },

  /** Admin ends a running auction right now; the highest bid wins. */
  endNow(id: number): Promise<void> {
    return withTransaction(async conn => {
      let a = await lockAuction(conn, id);
      if (!a) throw ApiError.notFound('Auction not found.');
      if (!isLive(a)) throw ApiError.conflict('This auction has already ended or was cancelled.');
      if (!a.started) throw ApiError.conflict("This auction hasn't started yet. Cancel it instead.");
      if (a.not_ended) {
        await conn.query('UPDATE auctions SET end_time = NOW() WHERE id = ?', [id]);
        a = (await lockAuction(conn, id))!;
      }
      await finalizeLocked(conn, a);
    });
  },

  /**
   * THE bid path. The auction row is locked first, so two simultaneous bids are processed one after the
   * other; the second one sees the first one's result and is rejected if it is no longer high enough.
   */
  placeBid(auctionId: number, userId: number, amount: number): Promise<number> {
    return withTransaction(async conn => {
      const a = await lockAuction(conn, auctionId);
      if (!a) throw ApiError.notFound('Auction not found.');
      if (a.status === 'CANCELLED') throw ApiError.conflict('This auction was cancelled.');
      if (a.status === 'ENDED' || !a.not_ended) throw ApiError.conflict('Auction has already ended.');
      if (!a.started) throw ApiError.conflict('Auction has not started yet.');
      if (a.highest_bidder_id === userId) throw ApiError.conflict("You're already the highest bidder.");

      const first = a.current_highest_bid === null;
      const tooLow = first ? amount < a.starting_price : amount <= (a.current_highest_bid as number);
      if (tooLow) {
        const minNext = first ? a.starting_price : Math.round(((a.current_highest_bid as number) + 0.01) * 100) / 100;
        throw new ApiError(409,
          first ? `Your bid must be at least ${money(a.starting_price)}.`
                : `Your bid must be higher than the current bid of ${money(a.current_highest_bid as number)}.`,
          { currentBid: a.current_highest_bid, minNextBid: minNext });
      }

      const [bid] = await conn.query<ResultSetHeader>(
        'INSERT INTO bids (auction_id, user_id, amount) VALUES (?, ?, ?)', [auctionId, userId, amount]);
      await conn.query(
        "UPDATE auctions SET current_highest_bid = ?, highest_bidder_id = ?, status = 'ACTIVE' WHERE id = ?",
        [amount, userId, auctionId]);

      if (a.highest_bidder_id) {
        await NotificationService.create(conn, {
          userId: a.highest_bidder_id, type: 'GENERAL', title: "You've been outbid",
          body: `Someone placed a higher bid (${money(amount)}) on "${a.product_name}".`,
          relatedType: 'AUCTION', relatedId: auctionId,
        });
      }
      return bid.insertId;
    });
  },

  /** Lazy finalization: called when someone looks at / bids on an auction whose time just ran out. */
  finalizeIfDue(id: number): Promise<void> {
    return withTransaction(async conn => {
      const a = await lockAuction(conn, id);
      if (a && isLive(a) && !a.not_ended) await finalizeLocked(conn, a);
    });
  },

  /** Used by the scheduler. Returns how many auctions were closed. */
  async finalizeDue(): Promise<number> {
    const [due] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM auctions WHERE status IN ('UPCOMING','ACTIVE') AND end_time <= NOW()");
    let closed = 0;
    for (const d of due) {
      try { await AuctionService.finalizeIfDue(d.id); closed++; }
      catch (err) { console.error(`[auctions] failed to finalize #${d.id}`, err); }
    }
    return closed;
  },
};
