import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminUser, MyBid, Order, Page, ProfilePayload, User, UserDetail, UserOverview, WonAuction } from '../models';
import { ApiService } from './api.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService, private session: SessionService) {}

  // ---- the logged-in customer ----
  overview(): Observable<UserOverview> { return this.api.get<UserOverview>('/users/me/overview'); }
  myBids(): Observable<MyBid[]> { return this.api.get<MyBid[]>('/users/me/bids'); }
  myWon(): Observable<WonAuction[]> { return this.api.get<WonAuction[]>('/users/me/won-auctions'); }

  updateProfile(body: ProfilePayload): Observable<User> {
    return this.api.put<User>('/users/me', body).pipe(tap(u => this.session.updateUser(u)));
  }
  changePassword(body: { currentPassword: string; newPassword: string; confirmNewPassword: string }): Observable<{ changed: boolean }> {
    return this.api.put<{ changed: boolean }>('/users/me/password', body);
  }
  uploadAvatar(file: File): Observable<User> {
    const form = new FormData();
    form.append('image', file);
    return this.api.put<User>('/users/me/avatar', form).pipe(tap(u => this.session.updateUser(u)));
  }
  removeAvatar(): Observable<User> { return this.api.delete<User>('/users/me/avatar').pipe(tap(u => this.session.updateUser(u))); }

  // ---- admin: user management ----
  adminList(query: { search?: string; status?: 'active' | 'inactive' | ''; page?: number; limit?: number } = {}): Observable<Page<AdminUser>> {
    return this.api.get<Page<AdminUser>>('/users', query);
  }
  adminGet(id: number): Observable<UserDetail> { return this.api.get<UserDetail>('/users/' + id); }
  setStatus(id: number, isActive: boolean): Observable<User> { return this.api.put<User>('/users/' + id + '/status', { isActive }); }
  adminOrders(id: number, page = 1): Observable<Page<Order>> { return this.api.get<Page<Order>>('/users/' + id + '/orders', { page }); }
  adminAuctions(id: number): Observable<MyBid[]> { return this.api.get<MyBid[]>('/users/' + id + '/auctions'); }
}
