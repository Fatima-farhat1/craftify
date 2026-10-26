import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Message, MessagePage } from '../models';
import { AlertsService } from './alerts.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MessageService {
  constructor(private api: ApiService, private alerts: AlertsService) {}

  list(query: { box?: 'inbox' | 'sent'; unread?: boolean; page?: number; limit?: number } = {}): Observable<MessagePage> {
    return this.api.get<MessagePage>('/messages', query);
  }
  get(id: number): Observable<Message> { return this.api.get<Message>('/messages/' + id); }
  /** Customers: goes to the admin. Admin: pass receiverId, or toAll for an announcement. */
  send(body: { subject: string; message: string; receiverId?: number; toAll?: boolean }): Observable<{ sent: number }> {
    return this.api.post<{ sent: number }>('/messages', body);
  }
  markRead(id: number): Observable<{ isRead: boolean }> {
    return this.api.put<{ isRead: boolean }>('/messages/' + id + '/read').pipe(tap(() => this.alerts.refresh()));
  }
  markAllRead(): Observable<{ unreadCount: number }> {
    return this.api.put<{ unreadCount: number }>('/messages/read-all').pipe(tap(() => this.alerts.refresh()));
  }
}
