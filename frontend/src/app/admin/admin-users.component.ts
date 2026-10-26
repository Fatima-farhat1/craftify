import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AdminUser, MyBid, Order, Page, UserDetail } from '../core/models';
import { MessageService } from '../core/services/message.service';
import { ToastService } from '../core/services/toast.service';
import { UserService } from '../core/services/user.service';
import { ConfirmService } from '../shared/components/feedback.components';

@Component({
  selector: 'cf-admin-users',
  template: `
    <div class="page-head"><div><span class="eyebrow">Customers</span><h1>Users</h1><p>There is a single administrator account; customers are managed here.</p></div></div>
    <form class="toolbar" [formGroup]="filters">
      <input class="input grow" type="search" formControlName="search" placeholder="Search by name or email…" aria-label="Search users">
      <select class="select" formControlName="status" aria-label="Status"><option value="">All users</option><option value="active">Active</option><option value="inactive">Deactivated</option></select>
    </form>
    <div class="panel">
      <cf-spinner *ngIf="loading"></cf-spinner>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load users" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
      <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="users" title="No users found" message="Try a different search."></cf-empty-state>
      <div class="table-wrap" *ngIf="!loading && data && data.items.length"><table class="table">
        <thead><tr><th>User</th><th>Orders</th><th>Bids</th><th>Joined</th><th>Status</th><th></th></tr></thead>
        <tbody><tr *ngFor="let u of data.items">
          <td><a class="cell" [routerLink]="['/admin/users', u.id]"><span class="av"><img *ngIf="u.profileImage; else ini" [src]="u.profileImage | imgUrl" alt=""><ng-template #ini>{{ u.firstName[0] }}{{ u.lastName[0] }}</ng-template></span><span><strong>{{ u.firstName }} {{ u.lastName }}</strong><small>{{ u.email }}</small></span></a></td>
          <td>{{ u.orderCount }}</td><td>{{ u.bidCount }}</td><td class="muted">{{ u.createdAt | date:'mediumDate' }}</td>
          <td><cf-status [value]="u.isActive ? 'active' : 'inactive'"></cf-status></td>
          <td class="right"><div class="row-actions">
            <a class="btn btn-outline btn-sm" [routerLink]="['/admin/users', u.id]">View</a>
            <a class="btn btn-ghost btn-sm" routerLink="/admin/messages" [queryParams]="{ to: u.id }" aria-label="Message"><cf-icon name="mail" [size]="16"></cf-icon></a>
            <button class="btn btn-ghost btn-sm" (click)="toggle(u)">{{ u.isActive ? 'Deactivate' : 'Activate' }}</button>
          </div></td>
        </tr></tbody></table></div>
    </div>
    <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>`,
  styles: [`.av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--brand-100); color: var(--brand-800); font-weight: 700; text-transform: uppercase; font-size: .85rem; flex-shrink: 0; } .av img { width: 100%; height: 100%; object-fit: cover; }`],
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  filters = this.fb.group({ search: [''], status: [''] });
  data: Page<AdminUser> | null = null;
  loading = true; error = '';
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private api: UserService, private toast: ToastService, private confirm: ConfirmService) {}
  ngOnInit(): void {
    this.filters.valueChanges.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.load(1));
    this.load(1);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(page: number): void {
    this.loading = true; this.error = '';
    const f = this.filters.value;
    this.api.adminList({ search: (f.search || '').trim(), status: f.status, page, limit: 12 }).subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }

  toggle(u: AdminUser): void {
    const next = !u.isActive;
    this.confirm.ask({ title: (next ? 'Activate ' : 'Deactivate ') + u.firstName + '?', message: next ? 'They will be able to log in again.' : 'They will be logged out immediately and unable to sign in or bid.', confirmText: next ? 'Activate' : 'Deactivate', danger: !next })
      .subscribe(ok => { if (ok) { this.api.setStatus(u.id, next).subscribe(r => { u.isActive = r.isActive; this.toast.success(next ? 'User activated' : 'User deactivated'); }, e => this.toast.error(e.message)); } });
  }
}

@Component({
  selector: 'cf-admin-user-detail',
  template: `
    <a routerLink="/admin/users" class="back">← Back to users</a>
    <cf-spinner *ngIf="loading" label="Loading user…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && !user" icon="alert" title="Couldn't load this user" [message]="error" actionLabel="Back" actionLink="/admin/users"></cf-empty-state>

    <ng-container *ngIf="user">
      <div class="page-head"><div><span class="eyebrow">Customer</span><h1>{{ user.firstName }} {{ user.lastName }}</h1></div>
        <div class="row-actions"><cf-status [value]="user.isActive ? 'active' : 'inactive'"></cf-status>
          <button class="btn btn-outline btn-sm" (click)="toggle()">{{ user.isActive ? 'Deactivate' : 'Activate' }}</button></div></div>

      <div class="stat-grid">
        <div class="stat"><span class="ic"><cf-icon name="package"></cf-icon></span><div><div class="v">{{ user.stats.orders }}</div><div class="l">Orders</div></div></div>
        <div class="stat"><span class="ic"><cf-icon name="dollar"></cf-icon></span><div><div class="v">{{ user.stats.totalSpent | money }}</div><div class="l">Total spent</div></div></div>
        <div class="stat"><span class="ic"><cf-icon name="gavel"></cf-icon></span><div><div class="v">{{ user.stats.auctionsBidOn }}</div><div class="l">Auctions bid on</div></div></div>
        <div class="stat"><span class="ic"><cf-icon name="trophy"></cf-icon></span><div><div class="v">{{ user.stats.auctionsWon }}</div><div class="l">Auctions won</div></div></div>
      </div>

      <div class="two-col">
        <div>
          <div class="tabs"><button class="tab" [class.on]="tab === 'orders'" (click)="tab = 'orders'">Orders</button><button class="tab" [class.on]="tab === 'auctions'" (click)="tab = 'auctions'">Auction activity</button></div>
          <div class="panel" *ngIf="tab === 'orders'">
            <p class="muted" *ngIf="!orders.length">No orders yet.</p>
            <div class="table-wrap" *ngIf="orders.length"><table class="table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody><tr *ngFor="let o of orders"><td><strong>{{ o.orderNumber }}</strong></td><td class="muted">{{ o.createdAt | date:'mediumDate' }}</td><td>{{ o.totalAmount | money }}</td><td><cf-status [value]="o.paymentStatus"></cf-status></td><td><cf-status [value]="o.status"></cf-status></td></tr></tbody></table></div>
          </div>
          <div class="panel" *ngIf="tab === 'auctions'">
            <p class="muted" *ngIf="!auctions.length">No auction activity.</p>
            <div class="table-wrap" *ngIf="auctions.length"><table class="table"><thead><tr><th>Auction</th><th>Their highest</th><th>Current bid</th><th>Standing</th></tr></thead>
              <tbody><tr *ngFor="let b of auctions"><td><a class="link" [routerLink]="['/admin/auctions', b.auctionId]">{{ b.productName }}</a></td><td>{{ b.myHighestBid | money }}</td><td>{{ b.currentBid | money }}</td><td><cf-status [value]="b.standing"></cf-status></td></tr></tbody></table></div>
          </div>
        </div>

        <aside>
          <div class="panel"><h3>Profile</h3>
            <dl class="kv"><dt>Email</dt><dd>{{ user.email }}</dd><dt>Phone</dt><dd>{{ user.phone || '—' }}</dd><dt>Address</dt><dd class="pre">{{ user.address || '—' }}</dd><dt>Joined</dt><dd>{{ user.createdAt | date:'mediumDate' }}</dd></dl></div>
          <form class="panel" [formGroup]="form" (ngSubmit)="send()" novalidate>
            <h3>Send a message</h3>
            <div class="field"><input class="input" formControlName="subject" placeholder="Subject" aria-label="Subject"></div>
            <div class="field"><textarea class="input" rows="4" formControlName="message" placeholder="Write your message…" aria-label="Message"></textarea></div>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="sending">{{ sending ? 'Sending…' : 'Send message' }}</button>
          </form>
        </aside>
      </div>
    </ng-container>`,
})
export class AdminUserDetailComponent implements OnInit {
  user: UserDetail | null = null;
  orders: Order[] = [];
  auctions: MyBid[] = [];
  tab: 'orders' | 'auctions' = 'orders';
  loading = true; error = ''; sending = false;
  form = this.fb.group({ subject: ['', [Validators.required, Validators.maxLength(200)]], message: ['', [Validators.required, Validators.maxLength(5000)]] });
  private id = 0;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private api: UserService, private messages: MessageService,
              private toast: ToastService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.adminGet(this.id).subscribe(u => {
      this.user = u; this.loading = false;
      this.api.adminOrders(this.id).subscribe(p => (this.orders = p.items), () => {});
      this.api.adminAuctions(this.id).subscribe(a => (this.auctions = a), () => {});
    }, e => { this.error = e.message; this.loading = false; });
  }

  toggle(): void {
    const next = !this.user.isActive;
    this.confirm.ask({ title: (next ? 'Activate ' : 'Deactivate ') + this.user.firstName + '?', message: next ? 'They will be able to log in again.' : 'They will be logged out immediately.', confirmText: next ? 'Activate' : 'Deactivate', danger: !next })
      .subscribe(ok => { if (ok) { this.api.setStatus(this.id, next).subscribe(r => { this.user.isActive = r.isActive; this.toast.success(next ? 'User activated' : 'User deactivated'); }, e => this.toast.error(e.message)); } });
  }

  send(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Add a subject and a message.'); return; }
    this.sending = true;
    this.messages.send({ ...this.form.value, receiverId: this.id }).subscribe(() => { this.sending = false; this.form.reset({ subject: '', message: '' }); this.toast.success('Message sent'); }, e => { this.sending = false; this.toast.error(e.message); });
  }
}
