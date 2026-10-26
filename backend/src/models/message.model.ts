import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

interface MessageRow extends RowDataPacket {
  id: number; sender_id: number; receiver_id: number; subject: string; message: string; is_read: number; created_at: Date;
  s_first: string; s_last: string; s_role: string; r_first: string; r_last: string; r_role: string;
}

const SELECT = `SELECT m.*, s.first_name AS s_first, s.last_name AS s_last, s.role AS s_role,
    r.first_name AS r_first, r.last_name AS r_last, r.role AS r_role
  FROM messages m JOIN users s ON s.id = m.sender_id JOIN users r ON r.id = m.receiver_id`;

const toMessage = (m: MessageRow, full: boolean) => ({
  id: m.id, subject: m.subject,
  ...(full ? { message: m.message } : { preview: m.message.replace(/\s+/g, ' ').slice(0, 120) }),
  isRead: !!m.is_read, createdAt: m.created_at,
  sender: { id: m.sender_id, name: `${m.s_first} ${m.s_last}`, fromAdmin: m.s_role === 'ADMIN' },
  receiver: { id: m.receiver_id, name: `${m.r_first} ${m.r_last}`, isAdmin: m.r_role === 'ADMIN' },
});

export const MessageModel = {
  async list(userId: number, f: { box: 'inbox' | 'sent'; unreadOnly: boolean; page: number; limit: number }) {
    const col = f.box === 'inbox' ? 'm.receiver_id' : 'm.sender_id';
    const where = [`${col} = ?`];
    if (f.unreadOnly && f.box === 'inbox') where.push('m.is_read = 0');
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query<MessageRow[]>(
      `${SELECT} ${whereSql} ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`,
      [userId, f.limit, (f.page - 1) * f.limit]);
    const [c] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM messages m ${whereSql}`, [userId]);
    const total = Number(c[0].total);
    return {
      items: rows.map(r => toMessage(r, false)),
      total, page: f.page, limit: f.limit, totalPages: Math.max(1, Math.ceil(total / f.limit)),
      unreadCount: await MessageModel.unreadCount(userId),
    };
  },

  async unreadCount(userId: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND is_read = 0', [userId]);
    return Number(rows[0].c);
  },

  /** Only the sender or the receiver may see a message. */
  async findForParticipant(id: number, userId: number) {
    const [rows] = await pool.execute<MessageRow[]>(
      `${SELECT} WHERE m.id = ? AND (m.sender_id = ? OR m.receiver_id = ?)`, [id, userId, userId]);
    return rows[0] ? { raw: rows[0], dto: toMessage(rows[0], true) } : null;
  },

  async markRead(id: number, receiverId: number): Promise<void> {
    await pool.execute('UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?', [id, receiverId]);
    // keep the bell badge consistent: reading the message clears its notification
    await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND related_type = 'MESSAGE' AND related_id = ?",
      [receiverId, id]);
  },

  async markAllRead(receiverId: number): Promise<void> {
    await pool.execute('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND is_read = 0', [receiverId]);
    await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND related_type = 'MESSAGE' AND is_read = 0", [receiverId]);
  },
};

export type { ResultSetHeader };
