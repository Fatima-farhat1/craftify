import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export type AuctionStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export type AuctionFilter = 'active' | 'upcoming' | 'ended' | 'cancelled' | 'all';
export type AuctionSort = 'ending_soon' | 'starting_soon' | 'recently_ended' | 'newest' | 'price_asc' | 'price_desc';

export interface AuctionRow extends RowDataPacket {
  id: number; product_id: number; starting_price: number; current_highest_bid: number | null;
  highest_bidder_id: number | null; start_time: Date; end_time: Date; status: AuctionStatus;
  winner_id: number | null; winning_bid: number | null; created_at: Date; updated_at: Date;
  server_time: Date; effective_status: AuctionStatus; bid_count: number; my_highest_bid: number | null;
  product_name: string; product_image: string | null; product_description: string | null; category_name: string;
  hb_first: string | null; hb_last: string | null; hb_email: string | null;
  w_first: string | null; w_last: string | null; w_email: string | null;
}

export interface ViewerContext { viewerId: number; isAdmin: boolean }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "Sara Khoury" -> "Sara K." (public bid history never exposes full names). */
export const maskName = (first: string | null, last: string | null) =>
  first ? `${first} ${(last || '').charAt(0)}.`.trim() : null;

// The stored status can lag behind the clock (the scheduler updates it every few seconds),
// so what we SHOW is always derived from the DB clock.
const EFFECTIVE = `CASE WHEN a.status = 'CANCELLED' THEN 'CANCELLED'
  WHEN a.status = 'ENDED' OR a.end_time <= NOW() THEN 'ENDED'
  WHEN a.start_time > NOW() THEN 'UPCOMING' ELSE 'ACTIVE' END`;

const SELECT = `SELECT a.*, NOW() AS server_time, ${EFFECTIVE} AS effective_status,
    p.name AS product_name, p.image AS product_image, p.description AS product_description, c.name AS category_name,
    (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count,
    (SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = a.id AND b.user_id = ?) AS my_highest_bid,
    hb.first_name AS hb_first, hb.last_name AS hb_last, hb.email AS hb_email,
    w.first_name AS w_first, w.last_name AS w_last, w.email AS w_email
  FROM auctions a
  JOIN products p ON p.id = a.product_id
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN users hb ON hb.id = a.highest_bidder_id
  LEFT JOIN users w ON w.id = a.winner_id`;

const LIVE = "a.status IN ('UPCOMING','ACTIVE')";
const STATUS_WHERE: Record<AuctionFilter, string> = {
  active: `${LIVE} AND a.start_time <= NOW() AND a.end_time > NOW()`,
  upcoming: `${LIVE} AND a.start_time > NOW()`,
  ended: `(a.status = 'ENDED' OR (${LIVE} AND a.end_time <= NOW()))`,
  cancelled: "a.status = 'CANCELLED'",
  all: '1 = 1',
};
const SORTS: Record<AuctionSort, string> = {
  ending_soon: 'a.end_time ASC, a.id ASC',
  starting_soon: 'a.start_time ASC, a.id ASC',
  recently_ended: 'a.end_time DESC, a.id DESC',
  newest: 'a.created_at DESC, a.id DESC',
  price_asc: 'COALESCE(a.current_highest_bid, a.starting_price) ASC, a.id ASC',
  price_desc: 'COALESCE(a.current_highest_bid, a.starting_price) DESC, a.id ASC',
};
const DEFAULT_SORT: Record<AuctionFilter, AuctionSort> = {
  active: 'ending_soon', upcoming: 'starting_soon', ended: 'recently_ended', cancelled: 'newest', all: 'newest',
};

export function toAuction(a: AuctionRow, ctx: ViewerContext) {
  const status = a.effective_status;
  const currentPrice = a.current_highest_bid ?? a.starting_price;
  const person = (id: number | null, f: string | null, l: string | null, e: string | null) =>
    id === null ? null : ctx.isAdmin ? { id, firstName: f, lastName: l, email: e } : { name: maskName(f, l) };
  return {
    id: a.id, productId: a.product_id, productName: a.product_name, productImage: a.product_image,
    categoryName: a.category_name,
    startingPrice: a.starting_price, currentBid: a.current_highest_bid, currentPrice,
    minNextBid: a.current_highest_bid === null ? a.starting_price : round2(a.current_highest_bid + 0.01),
    bidCount: a.bid_count, startTime: a.start_time, endTime: a.end_time, status,
    serverTime: a.server_time, // lets the browser correct for a wrong local clock in the countdown
    myHighestBid: a.my_highest_bid,
    isLeading: ctx.viewerId > 0 && a.highest_bidder_id === ctx.viewerId && (status === 'ACTIVE'),
    isWinner: ctx.viewerId > 0 && a.winner_id === ctx.viewerId,
    highestBidder: person(a.highest_bidder_id, a.hb_first, a.hb_last, a.hb_email),
    winner: person(a.winner_id, a.w_first, a.w_last, a.w_email),
    winningBid: a.winning_bid,
    createdAt: a.created_at,
  };
}

export const AuctionModel = {
  async list(f: {
    status: AuctionFilter; search?: string; categoryId?: number; sort?: AuctionSort;
    page: number; limit: number; ctx: ViewerContext;
  }) {
    const where = [f.status === 'all' && !f.ctx.isAdmin ? "a.status <> 'CANCELLED'" : STATUS_WHERE[f.status]];
    const params: unknown[] = [];
    if (f.search) {
      where.push('p.name LIKE ?');
      params.push(`%${f.search.replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (f.categoryId) { where.push('p.category_id = ?'); params.push(f.categoryId); }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const order = SORTS[f.sort ?? DEFAULT_SORT[f.status]];

    const [rows] = await pool.query<AuctionRow[]>(
      `${SELECT} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [f.ctx.viewerId, ...params, f.limit, (f.page - 1) * f.limit]);
    const [c] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM auctions a JOIN products p ON p.id = a.product_id ${whereSql}`, params);
    const total = Number(c[0].total);
    return {
      items: rows.map(r => toAuction(r, f.ctx)),
      total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)),
    };
  },

  async findById(id: number, ctx: ViewerContext) {
    const [rows] = await pool.query<AuctionRow[]>(`${SELECT} WHERE a.id = ?`, [ctx.viewerId, id]);
    return rows[0] ? { ...toAuction(rows[0], ctx), productDescription: rows[0].product_description } : null;
  },

  async listBids(auctionId: number, ctx: ViewerContext) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT b.id, b.amount, b.created_at, b.user_id, u.first_name, u.last_name, u.email
         FROM bids b JOIN users u ON u.id = b.user_id
        WHERE b.auction_id = ? ORDER BY b.amount DESC, b.id DESC LIMIT 200`, [auctionId]);
    return rows.map(r => ({
      id: r.id, amount: r.amount, createdAt: r.created_at, isMine: ctx.viewerId > 0 && r.user_id === ctx.viewerId,
      bidder: ctx.isAdmin
        ? { id: r.user_id, firstName: r.first_name, lastName: r.last_name, email: r.email }
        : { name: maskName(r.first_name, r.last_name) },
    }));
  },

  /** Every auction the user has bid on, with their standing in each. */
  async listForBidder(userId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.product_id, a.starting_price, a.current_highest_bid, a.highest_bidder_id, a.winner_id,
              a.start_time, a.end_time, ${EFFECTIVE} AS effective_status,
              p.name AS product_name, p.image AS product_image,
              mb.my_highest, mb.my_bid_count, mb.last_bid_at
         FROM (SELECT auction_id, MAX(amount) AS my_highest, COUNT(*) AS my_bid_count, MAX(created_at) AS last_bid_at
                 FROM bids WHERE user_id = ? GROUP BY auction_id) mb
         JOIN auctions a ON a.id = mb.auction_id
         JOIN products p ON p.id = a.product_id
        ORDER BY mb.last_bid_at DESC LIMIT 200`, [userId]);
    return rows.map(r => {
      const status: AuctionStatus = r.effective_status;
      const standing =
        status === 'CANCELLED' ? 'CANCELLED'
        : status === 'ENDED' ? (r.winner_id === userId ? 'WON' : 'LOST')
        : (r.highest_bidder_id === userId ? 'WINNING' : 'OUTBID');
      return {
        auctionId: r.id, productId: r.product_id, productName: r.product_name, productImage: r.product_image,
        status, standing, myHighestBid: r.my_highest, myBidCount: r.my_bid_count, lastBidAt: r.last_bid_at,
        currentBid: r.current_highest_bid ?? r.starting_price, startTime: r.start_time, endTime: r.end_time,
      };
    });
  },

  async listWonBy(userId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.product_id, a.winning_bid, a.end_time, p.name AS product_name, p.image AS product_image,
              o.id AS order_id, o.status AS order_status, o.payment_status, o.shipping_address
         FROM auctions a JOIN products p ON p.id = a.product_id
         LEFT JOIN orders o ON o.auction_id = a.id
        WHERE a.winner_id = ? AND a.status = 'ENDED' ORDER BY a.end_time DESC`, [userId]);
    return rows.map(r => ({
      auctionId: r.id, productId: r.product_id, productName: r.product_name, productImage: r.product_image,
      winningBid: r.winning_bid, endedAt: r.end_time,
      order: r.order_id ? {
        id: r.order_id, status: r.order_status, paymentStatus: r.payment_status,
        hasShippingAddress: !!r.shipping_address,
      } : null,
    }));
  },
};
