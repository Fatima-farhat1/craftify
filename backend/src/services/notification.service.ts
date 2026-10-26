import { PoolConnection } from 'mysql2/promise';

export type NotificationType =
  | 'NEW_MESSAGE' | 'AUCTION_WON' | 'AUCTION_LOST' | 'AUCTION_ENDING_SOON'
  | 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'GENERAL';

export interface NewNotification {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string;
  relatedType?: 'AUCTION' | 'ORDER' | 'MESSAGE';
  relatedId?: number;
}

export const NotificationService = {
  /** Pass the transaction connection so the notification commits/rolls back with the business change. */
  async create(db: Pick<PoolConnection, 'query'>, n: NewNotification): Promise<void> {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [n.userId, n.type, n.title, n.body ?? null, n.relatedType ?? null, n.relatedId ?? null]);
  },
};
