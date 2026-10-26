import { ResultSetHeader } from 'mysql2/promise';
import { withTransaction } from '../config/db';
import { NotificationService } from './notification.service';

export const MessageService = {
  /** Stores one message per receiver and a NEW_MESSAGE notification for each, atomically. */
  send(input: { senderId: number; senderName: string; receiverIds: number[]; subject: string; message: string }): Promise<number[]> {
    return withTransaction(async conn => {
      const ids: number[] = [];
      for (const receiverId of input.receiverIds) {
        const [r] = await conn.query<ResultSetHeader>(
          'INSERT INTO messages (sender_id, receiver_id, subject, message) VALUES (?, ?, ?, ?)',
          [input.senderId, receiverId, input.subject, input.message]);
        ids.push(r.insertId);
        await NotificationService.create(conn, {
          userId: receiverId, type: 'NEW_MESSAGE', title: 'New message',
          body: `${input.senderName}: ${input.subject}`.slice(0, 500),
          relatedType: 'MESSAGE', relatedId: r.insertId,
        });
      }
      return ids;
    });
  },
};
