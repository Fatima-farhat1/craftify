import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models';

const TOKEN_KEY = 'craftify_token';
const USER_KEY = 'craftify_user';

/**
 * Holds the JWT and the current user. It deliberately has NO HttpClient dependency,
 * so the HTTP interceptors can use it without creating a circular dependency.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private userSubject = new BehaviorSubject<User | null>(this.readUser());
  readonly user$ = this.userSubject.asObservable();

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  get user(): User | null { return this.userSubject.value; }
  get isLoggedIn(): boolean { return !!this.token && !!this.user; }
  get isAdmin(): boolean { return !!this.user && this.user.role === 'ADMIN'; }

  setSession(token: string, user: User): void {
    try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* private mode */ }
    this.userSubject.next(user);
  }

  updateUser(user: User): void {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
    this.userSubject.next(user);
  }

  clear(): void {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    this.userSubject.next(null);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(TOKEN_KEY) ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
