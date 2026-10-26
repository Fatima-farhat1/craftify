import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '../config/db';
import { OrderRow, OrderStatus, PaymentStatus, orderNumber } from '../models/order.model';
import { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import { NotificationService, NotificationType } from './notification.service';

interface CartLockRow extends RowDataPacket {
  product_id: number; quantity: number; name: string; price: number; stock_quantity: number; is_available: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_NOTICE: Record<OrderStatus, { type: NotificationType; title: string; verb: string } | null> = {
  PENDING: null,
  CONFIRMED: { type: 'ORDER_CONFIRMED', title: 'Order confirmed', verb: 'has been confirmed' },
  SHIPPED: { type: 'ORDER_SHIPPED', title: 'Order shipped', verb: 'is on its way' },
  DELIVERED: { type: 'ORDER_DELIVERED', title: 'Order delivered', verb: 'has been delivered' },
  CANCELLED: { type: 'GENERAL', title: 'Order cancelled', verb: 'has been cancelled' },
};

export const OrderService = {
  /** Turns the user's cart into an order. All-or-nothing: stock, order, items and cart clearing share one transaction. */
  checkout(userId: number, shippingAddress: string): Promise<number> {
    return withTransaction(async conn => {
      // Lock the cart's product rows (ordered by id to avoid deadlocks) so stock can't change under us.
      const [rows] = await conn.query<CartLockRow[]>(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock_quantity, p.is_available
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
          WHERE ci.user_id = ? ORDER BY p.id FOR UPDATE`, [userId]);
      if (!rows.length) throw ApiError.badRequest('Your cart is empty.');

      for (const r of rows) {
        if (!r.is_available) throw ApiError.conflict(`"${r.name}" is no longer available. Please remove it from your cart.`);
        if (r.stock_quantity < r.quantity) {
          throw ApiError.conflict(r.stock_quantity === 0
            ? `"${r.name}" is out of stock.`
            : `Only ${r.stock_quantity} of "${r.name}" left in stock.`);
        }
      }

      const total = round2(rows.reduce((s, r) => s + r.price * r.quantity, 0));
      const [order] = await conn.query<ResultSetHeader>(
        `INSERT INTO orders (user_id, total_amount, status, payment_status, shipping_address)
         VALUES (?, ?, 'PENDING', 'PENDING', ?)`, [userId, total, shippingAddress]);

      for (const r of rows) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`,
          [order.insertId, r.product_id, r.quantity, r.price, round2(r.price * r.quantity)]); // price snapshot
        await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [r.quantity, r.product_id]);
      }
      await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      await NotificationService.create(conn, {
        userId, type: 'GENERAL', title: 'Order received',
        body: `We received your order ${orderNumber(order.insertId)}. We'll confirm it shortly.`,
        relatedType: 'ORDER', relatedId: order.insertId,
      });
      return order.insertId;
    });
  },

  /** Admin: change status and/or payment status. Owner: cancel their own PENDING order. */
  updateStatus(orderId: number, actor: AuthUser, change: { status?: OrderStatus; paymentStatus?: PaymentStatus }): Promise<void> {
    return withTransaction(async conn => {
      const [rows] = await conn.query<OrderRow[]>('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      const order = rows[0];
      const isAdmin = actor.role === 'ADMIN';
      if (!order || (!isAdmin && order.user_id !== actor.id)) throw ApiError.notFound('Order not found.');

      if (!isAdmin) {
        if (change.status !== 'CANCELLED' || change.paymentStatus) throw ApiError.forbidden();
        if (order.status !== 'PENDING') throw ApiError.conflict('Only pending orders can be cancelled. Please contact us.');
      }

      const newStatus = change.status ?? order.status;
      if (newStatus !== order.status && !ALLOWED[order.status].includes(newStatus)) {
        throw ApiError.conflict(`An order that is ${order.status.toLowerCase()} cannot be changed to ${newStatus.toLowerCase()}.`);
      }
      const newPayment = change.paymentStatus ?? order.payment_status;

      await conn.query('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?', [newStatus, newPayment, orderId]);

      if (newStatus !== order.status) {
        // Cancelling a shop order puts the items back in stock. (Auction orders don't touch stock.)
        if (newStatus === 'CANCELLED' && order.auction_id === null) {
          await conn.query(
            `UPDATE products p JOIN order_items oi ON oi.product_id = p.id
                SET p.stock_quantity = p.stock_quantity + oi.quantity WHERE oi.order_id = ?`, [orderId]);
        }
        const notice = STATUS_NOTICE[newStatus];
        if (notice && isAdmin) {
          await NotificationService.create(conn, {
            userId: order.user_id, type: notice.type, title: notice.title,
            body: `Your order ${orderNumber(orderId)} ${notice.verb}.`,
            relatedType: 'ORDER', relatedId: orderId,
          });
        }
      }
    });
  },
};
