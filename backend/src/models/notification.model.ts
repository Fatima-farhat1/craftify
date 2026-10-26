import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

interface NotificationRow extends RowDataPacket {
  id: number; type: string; title: string; body: string | null;
  related_type: string | null; related_id: number | null; is_read: number; created_at: Date;
}

const toNotification = (n: NotificationRow) => ({
  id: n.id, type: n.type, title: n.title, body: n.body,
  relatedType: n.related_type, relatedId: n.related_id, isRead: !!n.is_read, createdAt: n.created_at,
});

export const NotificationModel = {
  async list(userId: number, f: { unreadOnly: boolean; page: number; limit: number }) {
    const whereSql = f.unreadOnly ? 'WHERE user_id = ? AND is_read = 0' : 'WHERE user_id = ?';
    const [rows] = await pool.query<NotificationRow[]>(
      `SELECT * FROM notifications ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [userId, f.limit, (f.page - 1) * f.limit]);
    const [c] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`, [userId]);
    const total = Number(c[0].total);
    return {
      items: rows.map(toNotification),
      total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)),
      unreadCount: await NotificationModel.unreadCount(userId),
    };
  },

  async unreadCount(userId: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return Number(rows[0].c);
  },

  /** Returns false when the notification doesn't exist or isn't the user's. */
  async markRead(id: number, userId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows[0]) return false;
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return true;
  },

  async markAllRead(userId: number): Promise<void> {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  },
};
