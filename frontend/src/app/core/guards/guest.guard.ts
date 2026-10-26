import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SessionService } from '../services/session.service';

/** For /login and /register: logged-in users are sent away (admin to the admin panel, customers home). */
@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.session.isLoggedIn) { return true; }
    return this.router.createUrlTree([this.session.isAdmin ? '/admin' : '/']);
  }
}
