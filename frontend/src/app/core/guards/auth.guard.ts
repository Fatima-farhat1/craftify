import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Role } from '../models';
import { SessionService } from '../services/session.service';

/**
 * Requires a logged-in user. Optionally restrict by role: { path: 'dashboard', canActivate: [AuthGuard], data: { roles: ['USER'] } }
 * (This only improves UX; the real protection is the backend's authorization.)
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const user = this.session.user;
    if (!this.session.isLoggedIn || !user) {
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    const roles: Role[] = route.data && route.data.roles;
    if (roles && roles.indexOf(user.role) === -1) {
      return this.router.createUrlTree([user.role === 'ADMIN' ? '/admin' : '/dashboard']);
    }
    return true;
  }
}
