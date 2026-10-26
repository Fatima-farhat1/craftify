import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NotificationPage } from '../models';
import { AlertsService } from './alerts.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private api: ApiService, private alerts: AlertsService) {}
  list(query: { unread?: boolean; page?: number; limit?: number } = {}): Observable<NotificationPage> {
    return this.api.get<NotificationPage>('/notifications', query);
  }
  markRead(id: number): Observable<{ isRead: boolean }> {
    return this.api.put<{ isRead: boolean }>('/notifications/' + id + '/read').pipe(tap(() => this.alerts.refresh()));
  }
  markAllRead(): Observable<{ unreadCount: number }> {
    return this.api.put<{ unreadCount: number }>('/notifications/read-all').pipe(tap(() => this.alerts.refresh()));
  }
}
