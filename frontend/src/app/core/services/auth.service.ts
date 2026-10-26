import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthResponse, RegisterPayload, User } from '../models';
import { ApiService } from './api.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService, private session: SessionService, private router: Router) {}

  login(email: string, password: string): Observable<User> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(this.store());
  }

  adminLogin(email: string, password: string): Observable<User> {
    return this.api.post<AuthResponse>('/auth/admin/login', { email, password }).pipe(this.store());
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.api.post<AuthResponse>('/auth/register', payload).pipe(this.store());
  }

  /** Re-validates the stored token with the server (e.g. user was deactivated) and refreshes the profile. */
  refreshMe(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(tap(u => this.session.updateUser(u)));
  }

  logout(redirectTo: string | null = '/'): void {
    this.session.clear();
    if (redirectTo) { this.router.navigateByUrl(redirectTo); }
  }

  /** Where each role lands after login. */
  homeFor(user: User): string { return user.role === 'ADMIN' ? '/admin' : '/dashboard'; }

  private store() {
    return (source: Observable<AuthResponse>): Observable<User> =>
      source.pipe(tap(r => this.session.setSession(r.token, r.user)), map(r => r.user));
  }
}
