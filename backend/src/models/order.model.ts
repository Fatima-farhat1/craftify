import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface OrderRow extends RowDataPacket {
  id: number; user_id: number; auction_id: number | null; total_amount: number;
  status: OrderStatus; payment_status: PaymentStatus; shipping_address: string;
  created_at: Date; updated_at: Date; first_name?: string; last_name?: string; email?: string;
}
interface ItemRow extends RowDataPacket {
  id: number; order_id: number; product_id: number; quantity: number; unit_price: number;
  total_price: number; product_name: string; product_image: string | null;
}

export const orderNumber = (id: number) => `CR-${String(id).padStart(6, '0')}`;

const toItem = (i: ItemRow) => ({
  id: i.id, productId: i.product_id, name: i.product_name, image: i.product_image,
  quantity: i.quantity, unitPrice: i.unit_price, totalPrice: i.total_price,
});

const toOrder = (o: OrderRow, items: ItemRow[]) => ({
  id: o.id, orderNumber: orderNumber(o.id), userId: o.user_id, auctionId: o.auction_id,
  totalAmount: o.total_amount, status: o.status, paymentStatus: o.payment_status,
  shippingAddress: o.shipping_address, createdAt: o.created_at, updatedAt: o.updated_at,
  ...(o.email ? { customer: { firstName: o.first_name, lastName: o.last_name, email: o.email } } : {}),
  items: items.filter(i => i.order_id === o.id).map(toItem),
});

async function withItems(rows: OrderRow[]) {
  if (!rows.length) return [];
  const [items] = await pool.query<ItemRow[]>(
    `SELECT oi.*, p.name AS product_name, p.image AS product_image
       FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id IN (?) ORDER BY oi.id`, [rows.map(r => r.id)]);
  return rows.map(r => toOrder(r, items));
}

const ORDER_SELECT = `SELECT o.*, u.first_name, u.last_name, u.email
   FROM orders o JOIN users u ON u.id = o.user_id`;

export const OrderModel = {
  async list(f: { userId?: number; status?: OrderStatus; page: number; limit: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.userId) { where.push('o.user_id = ?'); params.push(f.userId); }
    if (f.status) { where.push('o.status = ?'); params.push(f.status); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query<OrderRow[]>(
      `${ORDER_SELECT} ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
      [...params, f.limit, (f.page - 1) * f.limit]);
    const [c] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);
    const total = Number(c[0].total);
    return { items: await withItems(rows), total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)) };
  },

  /** Owner may edit the address only while the order is still PENDING (e.g. auction winners adding theirs). */
  async updateShippingAddress(id: number, userId: number, address: string): Promise<boolean> {
    const [r] = await pool.execute<import('mysql2/promise').ResultSetHeader>(
      "UPDATE orders SET shipping_address = ? WHERE id = ? AND user_id = ? AND status = 'PENDING'", [address, id, userId]);
    return r.affectedRows > 0;
  },

  async findById(id: number) {
    const [rows] = await pool.execute<OrderRow[]>(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
    return rows[0] ? (await withItems(rows))[0] : null;
  },
};
