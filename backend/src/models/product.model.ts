import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool, withTransaction } from '../config/db';

export interface ProductRow extends RowDataPacket {
  id: number; category_id: number; category_name: string; name: string; description: string | null;
  price: number; image: string | null; stock_quantity: number; is_available: number; is_featured: number;
  auction_id: number | null; created_at: Date; updated_at: Date;
}
export interface ImageRow extends RowDataPacket {
  id: number; product_id: number; image_url: string; is_primary: number;
}
export interface ProductInput {
  categoryId: number; name: string; description?: string; price: number;
  stockQuantity: number; isAvailable: boolean; isFeatured: boolean;
}
export interface ProductFilters {
  search?: string; categoryId?: number; minPrice?: number; maxPrice?: number; featured?: boolean;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'name'; page: number; limit: number; includeUnavailable: boolean;
}

// An auction that hasn't finished yet (drives the "auction" badge on product cards).
const AUCTION_ID = `(SELECT a.id FROM auctions a WHERE a.product_id = p.id
   AND a.status IN ('UPCOMING','ACTIVE') AND a.end_time > NOW() ORDER BY a.start_time LIMIT 1)`;
const SELECT_BASE = `SELECT p.*, c.name AS category_name, ${AUCTION_ID} AS auction_id
   FROM products p JOIN categories c ON c.id = p.category_id`;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
  name: 'p.name ASC',
};

export const toImage = (i: ImageRow) => ({ id: i.id, url: i.image_url, isPrimary: !!i.is_primary });

export const toProduct = (p: ProductRow, images?: ImageRow[]) => ({
  id: p.id, categoryId: p.category_id, categoryName: p.category_name, name: p.name,
  description: p.description, price: p.price, image: p.image, stockQuantity: p.stock_quantity,
  isAvailable: !!p.is_available, isFeatured: !!p.is_featured,
  auctionId: p.auction_id, hasAuction: p.auction_id !== null,
  createdAt: p.created_at, updatedAt: p.updated_at,
  ...(images ? { images: images.map(toImage) } : {}),
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

async function syncPrimary(conn: PoolConnection, productId: number): Promise<void> {
  const [imgs] = await conn.query<ImageRow[]>(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC', [productId]);
  if (!imgs.length) {
    await conn.query('UPDATE products SET image = NULL WHERE id = ?', [productId]);
    return;
  }
  if (!imgs[0].is_primary) await conn.query('UPDATE product_images SET is_primary = 1 WHERE id = ?', [imgs[0].id]);
  await conn.query('UPDATE products SET image = ? WHERE id = ?', [imgs[0].image_url, productId]);
}

async function insertImages(conn: PoolConnection, productId: number, urls: string[]): Promise<void> {
  for (const url of urls) {
    await conn.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 0)', [productId, url]);
  }
  if (urls.length) await syncPrimary(conn, productId);
}

const COLUMN_MAP: Record<keyof ProductInput, string> = {
  categoryId: 'category_id', name: 'name', description: 'description', price: 'price',
  stockQuantity: 'stock_quantity', isAvailable: 'is_available', isFeatured: 'is_featured',
};

export const ProductModel = {
  async list(f: ProductFilters) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (!f.includeUnavailable) where.push('p.is_available = 1');
    if (f.search) {
      const like = `%${escapeLike(f.search)}%`;
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(like, like);
    }
    if (f.categoryId) { where.push('p.category_id = ?'); params.push(f.categoryId); }
    if (f.minPrice !== undefined) { where.push('p.price >= ?'); params.push(f.minPrice); }
    if (f.maxPrice !== undefined) { where.push('p.price <= ?'); params.push(f.maxPrice); }
    if (f.featured) where.push('p.is_featured = 1');
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query<ProductRow[]>(
      `${SELECT_BASE} ${whereSql} ORDER BY ${SORTS[f.sort]} LIMIT ? OFFSET ?`,
      [...params, f.limit, (f.page - 1) * f.limit]);
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products p ${whereSql}`, params);
    const total = Number(countRows[0].total);
    return {
      items: rows.map(r => toProduct(r)),
      total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)),
    };
  },

  async findById(id: number) {
    const [rows] = await pool.execute<ProductRow[]>(`${SELECT_BASE} WHERE p.id = ?`, [id]);
    if (!rows[0]) return null;
    const [imgs] = await pool.execute<ImageRow[]>(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC', [id]);
    return toProduct(rows[0], imgs);
  },

  /** Available products by id, preserving the order of `ids`. */
  async findManyByIds(ids: number[]) {
    if (!ids.length) return [];
    const [rows] = await pool.query<ProductRow[]>(`${SELECT_BASE} WHERE p.id IN (?) AND p.is_available = 1`, [ids]);
    const byId = new Map(rows.map(r => [r.id, r]));
    return ids.filter(id => byId.has(id)).map(id => toProduct(byId.get(id)!));
  },

  create(input: ProductInput, imageUrls: string[]): Promise<number> {
    return withTransaction(async conn => {
      const [r] = await conn.execute<ResultSetHeader>(
        `INSERT INTO products (category_id, name, description, price, stock_quantity, is_available, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.categoryId, input.name, input.description ?? null, input.price, input.stockQuantity,
         input.isAvailable ? 1 : 0, input.isFeatured ? 1 : 0]);
      await insertImages(conn, r.insertId, imageUrls);
      return r.insertId;
    });
  },

  update(id: number, patch: Partial<ProductInput>, newImageUrls: string[]): Promise<void> {
    return withTransaction(async conn => {
      const sets: string[] = [];
      const params: unknown[] = [];
      (Object.keys(COLUMN_MAP) as (keyof ProductInput)[]).forEach(key => {
        const v = patch[key];
        if (v === undefined) return;
        sets.push(`${COLUMN_MAP[key]} = ?`);
        params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
      });
      if (sets.length) await conn.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
      await insertImages(conn, id, newImageUrls);
    });
  },

  /** Returns the deleted product's image urls (so files can be removed), or null if not found. */
  async remove(id: number): Promise<string[] | null> {
    const [imgs] = await pool.execute<ImageRow[]>('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
    const [r] = await pool.execute<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
    return r.affectedRows ? imgs.map(i => i.image_url) : null;
  },

  /** Returns the removed image url, or null if that image doesn't belong to the product. */
  removeImage(productId: number, imageId: number): Promise<string | null> {
    return withTransaction(async conn => {
      const [rows] = await conn.query<ImageRow[]>(
        'SELECT * FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
      if (!rows[0]) return null;
      await conn.query('DELETE FROM product_images WHERE id = ?', [imageId]);
      await syncPrimary(conn, productId);
      return rows[0].image_url;
    });
  },

  setPrimaryImage(productId: number, imageId: number): Promise<boolean> {
    return withTransaction(async conn => {
      const [rows] = await conn.query<ImageRow[]>(
        'SELECT id FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
      if (!rows[0]) return false;
      await conn.query('UPDATE product_images SET is_primary = (id = ?) WHERE product_id = ?', [imageId, productId]);
      await syncPrimary(conn, productId);
      return true;
    });
  },
};
