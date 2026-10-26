import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

export const FavoriteModel = {
  async listProductIds(userId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT product_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC, id DESC', [userId]);
    return rows.map(r => r.product_id);
  },
  async add(userId: number, productId: number): Promise<void> {
    await pool.execute('INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)', [userId, productId]);
  },
  async remove(userId: number, productId: number): Promise<void> {
    await pool.execute('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
  },
};
