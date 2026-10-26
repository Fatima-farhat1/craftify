import { Component, OnInit } from '@angular/core';
import { UserOverview } from '../core/models';
import { SessionService } from '../core/services/session.service';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'cf-overview',
  template: `
    <div class="page-head"><div><span class="eyebrow">Dashboard</span><h1>Welcome back, {{ session.user?.firstName }}</h1><p>Here's what's happening with your account.</p></div></div>

    <cf-spinner *ngIf="loading" label="Loading your dashboard…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your dashboard" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>

    <ng-container *ngIf="data as d">
      <div class="stat-grid">
        <a class="stat" routerLink="/dashboard/orders"><span class="ic"><cf-icon name="package"></cf-icon></span><div><div class="v">{{ d.totalPurchases }}</div><div class="l">Total purchases · {{ d.totalSpent | money }}</div></div></a>
        <a class="stat" routerLink="/dashboard/bids"><span class="ic"><cf-icon name="gavel"></cf-icon></span><div><div class="v">{{ d.activeBids }}</div><div class="l">Active bids · leading {{ d.leadingBids }}</div></div></a>
        <a class="stat" routerLink="/dashboard/won"><span class="ic"><cf-icon name="trophy"></cf-icon></span><div><div class="v">{{ d.auctionsWon }}</div><div class="l">Auctions won</div></div></a>
        <a class="stat" routerLink="/dashboard/messages"><span class="ic"><cf-icon name="mail"></cf-icon></span><div><div class="v">{{ d.unreadMessages }}</div><div class="l">Unread messages</div></div></a>
        <a class="stat" routerLink="/dashboard/favorites"><span class="ic"><cf-icon name="heart"></cf-icon></span><div><div class="v">{{ d.favorites }}</div><div class="l">Favorites</div></div></a>
        <a class="stat" routerLink="/cart"><span class="ic"><cf-icon name="bag"></cf-icon></span><div><div class="v">{{ d.cartItems }}</div><div class="l">Items in cart</div></div></a>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Recent orders</h3><a class="link" routerLink="/dashboard/orders">View all</a></div>
        <cf-empty-state *ngIf="!d.recentOrders.length" icon="package" title="No orders yet" message="Discover something handmade." actionLabel="Explore products" actionLink="/products"></cf-empty-state>
        <div class="table-wrap" *ngIf="d.recentOrders.length">
          <table class="table"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody><tr *ngFor="let o of d.recentOrders">
              <td><strong>{{ o.orderNumber }}</strong></td><td class="muted">{{ o.createdAt | date:'mediumDate' }}</td>
              <td>{{ o.items.length }}</td><td>{{ o.totalAmount | money }}</td><td><cf-status [value]="o.status"></cf-status></td>
            </tr></tbody></table>
        </div>
      </div>
    </ng-container>`,
  styles: [`a.stat { color: inherit; transition: transform .2s, box-shadow .2s; } a.stat:hover { transform: translateY(-2px); box-shadow: var(--shadow); }`],
})
export class OverviewComponent implements OnInit {
  data: UserOverview | null = null;
  loading = true;
  error = '';
  constructor(private api: UserService, public session: SessionService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.api.overview().subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}
