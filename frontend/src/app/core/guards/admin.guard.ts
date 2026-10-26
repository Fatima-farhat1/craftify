import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { SessionService } from '../services/session.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.session.isLoggedIn) {
      return this.router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
    }
    return this.session.isAdmin ? true : this.router.createUrlTree(['/']);
  }
}
