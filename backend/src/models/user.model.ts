import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { Role } from '../types';

export interface UserRow extends RowDataPacket {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  profile_image: string | null;
  address: string | null;
  role: Role;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async create(data: {
    firstName: string; lastName: string; email: string; passwordHash: string; role?: Role;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [data.firstName, data.lastName, data.email, data.passwordHash, data.role ?? 'USER']
    );
    return result.insertId;
  },

  async getAdminId(): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    return rows[0]?.id ?? null;
  },

  async updateProfile(id: number, d: {
    firstName: string; lastName: string; email: string; phone?: string; address?: string;
  }): Promise<void> {
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [d.firstName, d.lastName, d.email, d.phone ?? null, d.address ?? null, id]);
  },

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async setProfileImage(id: number, url: string | null): Promise<void> {
    await pool.execute('UPDATE users SET profile_image = ? WHERE id = ?', [url, id]);
  },

  async setActive(id: number, isActive: boolean): Promise<void> {
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  },

  /** Admin: customers only (the admin account never appears here). */
  async listCustomers(f: { search?: string; isActive?: boolean; page: number; limit: number }) {
    const where = ["u.role = 'USER'"];
    const params: unknown[] = [];
    if (f.search) {
      const like = `%${f.search.replace(/[\\%_]/g, '\\$&')}%`;
      where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)");
      params.push(like, like, like, like);
    }
    if (f.isActive !== undefined) { where.push('u.is_active = ?'); params.push(f.isActive ? 1 : 0); }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query<(UserRow & { order_count: number; bid_count: number })[]>(
      `SELECT u.*,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
              (SELECT COUNT(*) FROM bids b WHERE b.user_id = u.id) AS bid_count
         FROM users u ${whereSql} ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?`,
      [...params, f.limit, (f.page - 1) * f.limit]);
    const [c] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
    const total = Number(c[0].total);
    return {
      items: rows.map(r => ({ ...toPublicUser(r), orderCount: r.order_count, bidCount: r.bid_count })),
      total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)),
    };
  },

  async stats(userId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status <> 'CANCELLED') AS orders,
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = ? AND status <> 'CANCELLED') AS spent,
              (SELECT COUNT(DISTINCT auction_id) FROM bids WHERE user_id = ?) AS auctions_bid_on,
              (SELECT COUNT(*) FROM auctions WHERE winner_id = ? AND status = 'ENDED') AS auctions_won`,
      [userId, userId, userId, userId]);
    const r = rows[0];
    return { orders: r.orders, totalSpent: r.spent, auctionsBidOn: r.auctions_bid_on, auctionsWon: r.auctions_won };
  },

  async adminExists(): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    return rows.length > 0;
  },
};

/** Never send password_hash to the client. */
export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone,
    profileImage: u.profile_image,
    address: u.address,
    role: u.role,
    isActive: !!u.is_active,
    createdAt: u.created_at,
  };
}
