import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

export interface CategoryRow extends RowDataPacket {
  id: number; name: string; description: string | null; image: string | null;
  created_at: Date; product_count?: number;
}

export const toCategory = (c: CategoryRow) => ({
  id: c.id, name: c.name, description: c.description, image: c.image,
  productCount: c.product_count, createdAt: c.created_at,
});

export const CategoryModel = {
  async list(): Promise<CategoryRow[]> {
    const [rows] = await pool.execute<CategoryRow[]>(
      `SELECT c.*, COUNT(p.id) AS product_count
         FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_available = 1
        GROUP BY c.id ORDER BY c.name`);
    return rows;
  },
  async findById(id: number): Promise<CategoryRow | null> {
    const [rows] = await pool.execute<CategoryRow[]>('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] ?? null;
  },
  async create(d: { name: string; description?: string; image?: string }): Promise<number> {
    const [r] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
      [d.name, d.description ?? null, d.image ?? null]);
    return r.insertId;
  },
  /** image is only changed when a new one is provided. */
  async update(id: number, d: { name: string; description?: string; image?: string }): Promise<void> {
    await pool.execute(
      'UPDATE categories SET name = ?, description = ?, image = COALESCE(?, image) WHERE id = ?',
      [d.name, d.description ?? null, d.image ?? null, id]);
  },
  async remove(id: number): Promise<void> {
    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  },
};
