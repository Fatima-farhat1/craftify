import { Component } from '@angular/core';
import { AlertsService } from '../core/services/alerts.service';
import { AuthService } from '../core/services/auth.service';
import { SessionService } from '../core/services/session.service';

@Component({
  selector: 'cf-dashboard-layout',
  template: `
    <div class="container dash">
      <aside class="side">
        <div class="me" *ngIf="session.user$ | async as u">
          <span class="avatar"><img *ngIf="u.profileImage; else ini" [src]="u.profileImage | imgUrl" [alt]="u.firstName"><ng-template #ini>{{ u.firstName[0] }}{{ u.lastName[0] }}</ng-template></span>
          <div><strong>{{ u.firstName }} {{ u.lastName }}</strong><small>{{ u.email }}</small></div>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }"><cf-icon name="layout" [size]="18"></cf-icon> Overview</a>
          <a routerLink="/dashboard/orders" routerLinkActive="on"><cf-icon name="package" [size]="18"></cf-icon> My orders</a>
          <a routerLink="/dashboard/bids" routerLinkActive="on"><cf-icon name="gavel" [size]="18"></cf-icon> My bids</a>
          <a routerLink="/dashboard/won" routerLinkActive="on"><cf-icon name="trophy" [size]="18"></cf-icon> Won auctions</a>
          <a routerLink="/dashboard/favorites" routerLinkActive="on"><cf-icon name="heart" [size]="18"></cf-icon> Favorites</a>
          <a routerLink="/dashboard/messages" routerLinkActive="on"><cf-icon name="mail" [size]="18"></cf-icon> Messages <span class="b" *ngIf="alerts.messages$ | async as n">{{ n }}</span></a>
          <a routerLink="/dashboard/notifications" routerLinkActive="on"><cf-icon name="bell" [size]="18"></cf-icon> Notifications <span class="b" *ngIf="alerts.notifications$ | async as n">{{ n }}</span></a>
          <a routerLink="/dashboard/profile" routerLinkActive="on"><cf-icon name="user" [size]="18"></cf-icon> Profile</a>
          <button type="button" (click)="auth.logout('/')"><cf-icon name="log-out" [size]="18"></cf-icon> Log out</button>
        </nav>
      </aside>
      <div class="content"><router-outlet></router-outlet></div>
    </div>`,
  styles: [`
    .dash { display: grid; grid-template-columns: 260px 1fr; gap: 32px; padding-top: 36px; padding-bottom: 64px; align-items: start; }
    .side { position: sticky; top: calc(var(--header-h) + 16px); background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; }
    .me { display: flex; align-items: center; gap: 12px; padding: 8px 8px 16px; margin-bottom: 8px; border-bottom: 1px solid var(--line); min-width: 0; } .me div { min-width: 0; } .me strong, .me small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .me small { color: var(--muted); font-size: .8rem; }
    .avatar { width: 46px; height: 46px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: var(--brand-100); color: var(--brand-800); font-weight: 700; text-transform: uppercase; flex-shrink: 0; } .avatar img { width: 100%; height: 100%; object-fit: cover; }
    nav { display: flex; flex-direction: column; gap: 2px; }
    nav a, nav button { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 0; background: none; border-radius: 12px; font: inherit; font-weight: 500; color: var(--ink-soft); text-align: left; transition: background .2s, color .2s; }
    nav a:hover, nav button:hover { background: var(--beige); } nav a.on { background: var(--brand-50); color: var(--brand-800); font-weight: 700; } nav a.on cf-icon { color: var(--brand-600); }
    .b { margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: var(--brand-600); color: #fff; font-size: .72rem; font-weight: 700; }
    .content { min-width: 0; }
    @media (max-width: 900px) {
      .dash { grid-template-columns: 1fr; gap: 18px; padding-top: 20px; } .side { position: static; padding: 10px; } .me { display: none; }
      nav { flex-direction: row; overflow-x: auto; gap: 6px; padding-bottom: 4px; } nav a, nav button { white-space: nowrap; padding: 9px 14px; }
    }
  `],
})
export class DashboardLayoutComponent {
  constructor(public session: SessionService, public alerts: AlertsService, public auth: AuthService) {}
}
