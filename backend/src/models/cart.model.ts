import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

interface CartRow extends RowDataPacket {
  product_id: number; quantity: number; name: string; price: number; image: string | null;
  stock_quantity: number; is_available: number; category_name: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const CartModel = {
  async get(userId: number) {
    const [rows] = await pool.execute<CartRow[]>(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.image, p.stock_quantity, p.is_available,
              c.name AS category_name
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ? ORDER BY ci.created_at DESC, ci.id DESC`, [userId]);

    const items = rows.map(r => {
      let issue: string | null = null;
      if (!r.is_available) issue = 'This item is no longer available.';
      else if (r.stock_quantity === 0) issue = 'Out of stock.';
      else if (r.quantity > r.stock_quantity) issue = `Only ${r.stock_quantity} left in stock.`;
      return {
        productId: r.product_id, name: r.name, categoryName: r.category_name, image: r.image,
        unitPrice: r.price, quantity: r.quantity, lineTotal: round2(r.price * r.quantity),
        stockQuantity: r.stock_quantity, issue,
      };
    });
    const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
    return {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      total: subtotal, // no shipping/tax in v1
      canCheckout: items.length > 0 && items.every(i => !i.issue),
    };
  },

  async getQuantity(userId: number, productId: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
    return rows[0]?.quantity ?? 0;
  },

  async setQuantity(userId: number, productId: number, quantity: number): Promise<void> {
    await pool.execute(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`, [userId, productId, quantity]);
  },

  async remove(userId: number, productId: number): Promise<void> {
    await pool.execute('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
  },

  async clear(userId: number): Promise<void> {
    await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  },
};
