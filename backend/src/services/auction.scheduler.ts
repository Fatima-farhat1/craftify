import { pool } from '../config/db';
import { env } from '../config/env';
import { AuctionService } from './auction.service';

let timer: NodeJS.Timeout | undefined;
let running = false;

async function tick() {
  if (running) return; // never overlap runs
  running = true;
  try {
    const closed = await AuctionService.finalizeDue();
    if (closed) console.log(`[auctions] finalized ${closed} auction(s)`);

    await pool.query(
      `UPDATE auctions SET status = 'ACTIVE' WHERE status = 'UPCOMING' AND start_time <= NOW() AND end_time > NOW()`);

    // "Ending soon" reminder (1 hour) for everyone who has bid; NOT EXISTS makes it send only once.
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
       SELECT DISTINCT b.user_id, 'AUCTION_ENDING_SOON', 'Auction ending soon',
              CONCAT('The auction for "', p.name, '" ends within an hour.'), 'AUCTION', a.id
         FROM auctions a JOIN products p ON p.id = a.product_id JOIN bids b ON b.auction_id = a.id
        WHERE a.status IN ('UPCOMING','ACTIVE') AND a.end_time > NOW() AND a.end_time <= NOW() + INTERVAL 1 HOUR
          AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = b.user_id
                            AND n.type = 'AUCTION_ENDING_SOON' AND n.related_type = 'AUCTION' AND n.related_id = a.id)`);
  } catch (err) {
    console.error('[auctions] scheduler error', err);
  } finally {
    running = false;
  }
}

export function startAuctionScheduler() {
  void tick();
  timer = setInterval(tick, env.auctionPollMs);
  timer.unref();
}

export function stopAuctionScheduler() {
  if (timer) clearInterval(timer);
}
