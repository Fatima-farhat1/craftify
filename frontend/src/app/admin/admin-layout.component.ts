import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AlertsService } from '../core/services/alerts.service';
import { AuthService } from '../core/services/auth.service';
import { SessionService } from '../core/services/session.service';

@Component({
  selector: 'cf-admin-layout',
  template: `
    <div class="shell" [class.open]="open">
      <aside class="sb">
        <a routerLink="/admin" class="brand">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#EE7421"/><path d="M12 8h8M13 8c0 3-3 4-3 9a6 6 0 0 0 12 0c0-5-3-6-3-9" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Craftify <small>Admin</small>
        </a>
        <nav>
          <a routerLink="/admin" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }"><cf-icon name="layout" [size]="18"></cf-icon> Dashboard</a>
          <a routerLink="/admin/products" routerLinkActive="on"><cf-icon name="tag" [size]="18"></cf-icon> Products</a>
          <a routerLink="/admin/categories" routerLinkActive="on"><cf-icon name="folder" [size]="18"></cf-icon> Categories</a>
          <a routerLink="/admin/orders" routerLinkActive="on"><cf-icon name="package" [size]="18"></cf-icon> Orders</a>
          <a routerLink="/admin/auctions" routerLinkActive="on"><cf-icon name="gavel" [size]="18"></cf-icon> Auctions</a>
          <a routerLink="/admin/users" routerLinkActive="on"><cf-icon name="users" [size]="18"></cf-icon> Users</a>
          <a routerLink="/admin/messages" routerLinkActive="on"><cf-icon name="mail" [size]="18"></cf-icon> Messages <span class="b" *ngIf="alerts.messages$ | async as n">{{ n }}</span></a>
        </nav>
        <div class="foot">
          <a routerLink="/"><cf-icon name="home" [size]="18"></cf-icon> View shop</a>
          <button type="button" (click)="auth.logout('/admin/login')"><cf-icon name="log-out" [size]="18"></cf-icon> Log out</button>
        </div>
      </aside>
      <div class="backdrop" (click)="open = false"></div>

      <div class="main">
        <header class="top">
          <button type="button" class="burger" (click)="open = !open" aria-label="Menu"><cf-icon [name]="open ? 'x' : 'menu'" [size]="22"></cf-icon></button>
          <span class="who" *ngIf="session.user$ | async as u">Signed in as <strong>{{ u.firstName }} {{ u.lastName }}</strong></span>
        </header>
        <div class="page"><router-outlet></router-outlet></div>
      </div>
    </div>`,
  styles: [`
    .shell { display: grid; grid-template-columns: 252px 1fr; min-height: 100vh; }
    .sb { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--ink); color: #D9CFC3; padding: 22px 14px; z-index: 40; }
    .brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 22px; font: 700 1.4rem var(--font-display); color: #fff; } .brand small { font: 700 .62rem var(--font-body); letter-spacing: .14em; text-transform: uppercase; background: var(--brand-600); padding: 3px 8px; border-radius: 999px; }
    nav { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
    nav a, .foot a, .foot button { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 0; background: none; border-radius: 12px; font: inherit; font-weight: 500; color: #D9CFC3; text-align: left; transition: background .2s, color .2s; }
    nav a:hover, .foot a:hover, .foot button:hover { background: rgba(255, 255, 255, .08); color: #fff; } nav a.on { background: var(--brand-600); color: #fff; }
    .b { margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: #fff; color: var(--brand-700); font-size: .72rem; font-weight: 700; }
    .foot { border-top: 1px solid rgba(255, 255, 255, .1); padding-top: 12px; display: flex; flex-direction: column; gap: 2px; }
    .main { min-width: 0; display: flex; flex-direction: column; }
    .top { display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 28px; background: var(--white); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 30; }
    .who { color: var(--muted); font-size: .9rem; margin-left: auto; } .who strong { color: var(--ink); } .burger { display: none; border: 0; background: none; padding: 6px; color: var(--ink); }
    .page { padding: 32px 28px 64px; max-width: 1280px; width: 100%; }
    .backdrop { display: none; }
    @media (max-width: 960px) {
      .shell { grid-template-columns: 1fr; } .sb { position: fixed; left: 0; top: 0; width: 270px; transform: translateX(-100%); transition: transform .25s; }
      .shell.open .sb { transform: none; box-shadow: var(--shadow-lg); } .shell.open .backdrop { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .45); z-index: 35; }
      .burger { display: inline-grid; } .top, .page { padding-left: 16px; padding-right: 16px; } .who { display: none; }
    }
  `],
})
export class AdminLayoutComponent implements OnDestroy {
  open = false;
  private sub: Subscription;
  constructor(public session: SessionService, public alerts: AlertsService, public auth: AuthService, router: Router) {
    this.sub = router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => (this.open = false));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
