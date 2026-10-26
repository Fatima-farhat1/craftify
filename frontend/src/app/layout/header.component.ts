import { Component, HostListener, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AlertsService } from '../core/services/alerts.service';
import { AuthService } from '../core/services/auth.service';
import { CartService } from '../core/services/cart.service';
import { SessionService } from '../core/services/session.service';

@Component({
  selector: 'cf-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnDestroy {
  scrolled = false;
  menuOpen = false;
  cartCount$ = this.cart.count$;
  notificationCount$ = this.alerts.notifications$;
  private sub: Subscription;

  constructor(
    public session: SessionService, private cart: CartService, private alerts: AlertsService,
    private auth: AuthService, private router: Router
  ) {
    // close the mobile menu after every navigation
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => (this.menuOpen = false));
  }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.pageYOffset > 8; }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  initials(first: string, last: string): string { return ((first || '')[0] || '') + ((last || '')[0] || ''); }

  search(value: string, event: Event): void {
    event.preventDefault();
    this.menuOpen = false;
    this.router.navigate(['/products'], { queryParams: { search: value.trim() || null } });
  }

  logout(): void { this.menuOpen = false; this.auth.logout('/'); }
}
