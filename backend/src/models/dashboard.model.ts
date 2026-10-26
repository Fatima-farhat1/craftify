import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import { AuctionModel } from './auction.model';
import { MessageModel } from './message.model';
import { OrderModel } from './order.model';
import { NotificationModel } from './notification.model';
import { UserRow, toPublicUser } from './user.model';

const one = async (sql: string, params: unknown[] = []) => {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows[0];
};

const LIVE = "status IN ('UPCOMING','ACTIVE')";

export const DashboardModel = {
  async userOverview(userId: number) {
    const [orders, bids, won, favorites, cart, unreadMessages, unreadNotifications, recentOrders] = await Promise.all([
      one(`SELECT COUNT(*) AS c, COALESCE(SUM(total_amount), 0) AS spent FROM orders WHERE user_id = ? AND status <> 'CANCELLED'`, [userId]),
      one(`SELECT COUNT(DISTINCT b.auction_id) AS active, COUNT(DISTINCT CASE WHEN a.highest_bidder_id = ? THEN a.id END) AS leading_bids
             FROM bids b JOIN auctions a ON a.id = b.auction_id
            WHERE b.user_id = ? AND a.${LIVE} AND a.end_time > NOW()`, [userId, userId]),
      one("SELECT COUNT(*) AS c FROM auctions WHERE winner_id = ? AND status = 'ENDED'", [userId]),
      one('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?', [userId]),
      one('SELECT COALESCE(SUM(quantity), 0) AS c FROM cart_items WHERE user_id = ?', [userId]),
      MessageModel.unreadCount(userId),
      NotificationModel.unreadCount(userId),
      OrderModel.list({ userId, page: 1, limit: 5 }),
    ]);
    return {
      totalPurchases: orders.c, totalSpent: orders.spent,
      activeBids: bids.active, leadingBids: bids.leading_bids,
      auctionsWon: won.c, favorites: favorites.c, cartItems: cart.c,
      unreadMessages, unreadNotifications,
      recentOrders: recentOrders.items,
    };
  },

  async adminOverview(adminId: number) {
    const [users, products, orders, byStatus, sales, auctions, unreadMessages, recentOrders, recentUsers, recentAuctions] =
      await Promise.all([
        one("SELECT COUNT(*) AS c FROM users WHERE role = 'USER'"),
        one('SELECT COUNT(*) AS c, COALESCE(SUM(stock_quantity = 0), 0) AS out_of_stock FROM products'),
        one('SELECT COUNT(*) AS c FROM orders'),
        pool.query<RowDataPacket[]>('SELECT status, COUNT(*) AS c FROM orders GROUP BY status').then(r => r[0]),
        one(`SELECT COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND status <> 'CANCELLED' THEN total_amount END), 0) AS paid,
                    COALESCE(SUM(CASE WHEN payment_status = 'PENDING' AND status <> 'CANCELLED' THEN total_amount END), 0) AS pending
               FROM orders`),
        one(`SELECT
               COALESCE(SUM(${LIVE} AND start_time <= NOW() AND end_time > NOW()), 0) AS active,
               COALESCE(SUM(${LIVE} AND start_time > NOW()), 0) AS upcoming,
               COALESCE(SUM(status = 'ENDED' OR (${LIVE} AND end_time <= NOW())), 0) AS completed,
               COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled
             FROM auctions`),
        MessageModel.unreadCount(adminId),
        OrderModel.list({ page: 1, limit: 5 }),
        pool.query<(UserRow)[]>("SELECT * FROM users WHERE role = 'USER' ORDER BY created_at DESC, id DESC LIMIT 5")
          .then(r => r[0].map(toPublicUser)),
        AuctionModel.list({ status: 'all', sort: 'newest', page: 1, limit: 5, ctx: { viewerId: 0, isAdmin: true } }),
      ]);
    return {
      totalUsers: users.c, totalProducts: products.c, outOfStockProducts: products.out_of_stock,
      totalOrders: orders.c,
      ordersByStatus: Object.fromEntries((byStatus as RowDataPacket[]).map(r => [r.status, r.c])),
      totalSales: sales.paid, pendingPayments: sales.pending,
      auctions: { active: auctions.active, upcoming: auctions.upcoming, completed: auctions.completed, cancelled: auctions.cancelled },
      unreadMessages,
      recentOrders: recentOrders.items, recentUsers, recentAuctions: recentAuctions.items,
    };
  },
};
