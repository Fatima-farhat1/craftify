import { Component, OnInit } from '@angular/core';
import { AdminOverview } from '../core/models';
import { AdminService } from '../core/services/admin.service';

@Component({
  selector: 'cf-admin-dashboard',
  template: `
    <div class="page-head"><div><span class="eyebrow">Overview</span><h1>Dashboard</h1><p>How Craftify is doing right now.</p></div>
      <button class="btn btn-outline btn-sm" (click)="load()">Refresh</button></div>

    <cf-spinner *ngIf="loading" label="Loading dashboard…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load the dashboard" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>

    <ng-container *ngIf="d">
      <div class="stat-grid">
        <a class="stat" routerLink="/admin/users"><span class="ic"><cf-icon name="users"></cf-icon></span><div><div class="v">{{ d.totalUsers }}</div><div class="l">Total users</div></div></a>
        <a class="stat" routerLink="/admin/products"><span class="ic"><cf-icon name="tag"></cf-icon></span><div><div class="v">{{ d.totalProducts }}</div><div class="l">Products · {{ d.outOfStockProducts }} sold out</div></div></a>
        <a class="stat" routerLink="/admin/orders"><span class="ic"><cf-icon name="package"></cf-icon></span><div><div class="v">{{ d.totalOrders }}</div><div class="l">Total orders</div></div></a>
        <div class="stat"><span class="ic"><cf-icon name="dollar"></cf-icon></span><div><div class="v">{{ d.totalSales | money }}</div><div class="l">Total sales (paid)</div></div></div>
        <div class="stat"><span class="ic"><cf-icon name="clock"></cf-icon></span><div><div class="v">{{ d.pendingPayments | money }}</div><div class="l">Pending payments</div></div></div>
        <a class="stat" routerLink="/admin/auctions" [queryParams]="{ status: 'active' }"><span class="ic"><cf-icon name="gavel"></cf-icon></span><div><div class="v">{{ d.auctions.active }}</div><div class="l">Active auctions · {{ d.auctions.upcoming }} upcoming</div></div></a>
        <a class="stat" routerLink="/admin/auctions" [queryParams]="{ status: 'ended' }"><span class="ic"><cf-icon name="trophy"></cf-icon></span><div><div class="v">{{ d.auctions.completed }}</div><div class="l">Completed auctions</div></div></a>
        <a class="stat" routerLink="/admin/messages"><span class="ic"><cf-icon name="mail"></cf-icon></span><div><div class="v">{{ d.unreadMessages }}</div><div class="l">Unread messages</div></div></a>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Orders by status</h3></div>
        <div class="chips"><a *ngFor="let s of statuses" class="chip" routerLink="/admin/orders" [queryParams]="{ status: s }"><cf-status [value]="s"></cf-status> <strong>{{ d.ordersByStatus[s] || 0 }}</strong></a></div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Recent orders</h3><a class="link" routerLink="/admin/orders">View all</a></div>
        <p class="muted" *ngIf="!d.recentOrders.length">No orders yet.</p>
        <div class="table-wrap" *ngIf="d.recentOrders.length"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody><tr *ngFor="let o of d.recentOrders"><td><strong>{{ o.orderNumber }}</strong></td><td>{{ o.customer?.firstName }} {{ o.customer?.lastName }}</td><td>{{ o.totalAmount | money }}</td><td><cf-status [value]="o.status"></cf-status></td><td class="muted">{{ o.createdAt | date:'MMM d' }}</td></tr></tbody></table></div>
      </div>

      <div class="two">
        <div class="panel">
          <div class="panel-head"><h3>Recent users</h3><a class="link" routerLink="/admin/users">View all</a></div>
          <p class="muted" *ngIf="!d.recentUsers.length">No users yet.</p>
          <a class="row" *ngFor="let u of d.recentUsers" [routerLink]="['/admin/users', u.id]"><span class="av">{{ u.firstName[0] }}{{ u.lastName[0] }}</span><span><strong>{{ u.firstName }} {{ u.lastName }}</strong><small>{{ u.email }}</small></span><small class="r">{{ u.createdAt | date:'MMM d' }}</small></a>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Recent auctions</h3><a class="link" routerLink="/admin/auctions">View all</a></div>
          <p class="muted" *ngIf="!d.recentAuctions.length">No auctions yet.</p>
          <a class="row" *ngFor="let a of d.recentAuctions" [routerLink]="['/admin/auctions', a.id]"><img class="thumb" [src]="a.productImage | imgUrl" alt=""><span><strong>{{ a.productName }}</strong><small>{{ a.currentPrice | money }} · {{ a.bidCount }} bids</small></span><cf-status class="r" [value]="a.status"></cf-status></a>
        </div>
      </div>
    </ng-container>`,
  styles: [`
    a.stat { color: inherit; transition: transform .2s, box-shadow .2s; } a.stat:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .panel + .panel { margin-top: 20px; } .chips { display: flex; gap: 10px; flex-wrap: wrap; } .chip { gap: 10px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; } .two .panel + .panel { margin-top: 0; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 6px; border-bottom: 1px solid var(--line); border-radius: 10px; } .row:last-child { border-bottom: 0; } .row:hover { background: #FFFAF3; } .row span:nth-child(2) { flex: 1; min-width: 0; } .row strong, .row small { display: block; overflow: hidden; text-overflow: ellipsis; } .row small { color: var(--muted); } .r { margin-left: auto; white-space: nowrap; }
    .av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--brand-100); color: var(--brand-800); font-weight: 700; text-transform: uppercase; font-size: .85rem; }
    @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
  `],
})
export class AdminDashboardComponent implements OnInit {
  d: AdminOverview | null = null;
  loading = true; error = '';
  statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  constructor(private api: AdminService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.api.overview().subscribe(d => { this.d = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}
