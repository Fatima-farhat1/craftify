import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Auction, AuctionStatus, Bid, Page, Product } from '../core/models';
import { AuctionService } from '../core/services/auction.service';
import { ProductService } from '../core/services/product.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../shared/components/feedback.components';

type Tab = 'all' | 'active' | 'upcoming' | 'ended' | 'cancelled';

@Component({
  selector: 'cf-admin-auctions',
  template: `
    <div class="page-head"><div><span class="eyebrow">Auctions</span><h1>Auction management</h1></div>
      <a class="btn btn-primary" routerLink="/admin/auctions/new"><cf-icon name="plus" [size]="16"></cf-icon> New auction</a></div>
    <div class="tabs"><button class="tab" *ngFor="let t of tabs" [class.on]="tab === t" (click)="setTab(t)">{{ t | titlecase }}</button></div>

    <div class="panel">
      <cf-spinner *ngIf="loading"></cf-spinner>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load auctions" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
      <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="gavel" title="No auctions here" message="Create an auction from any product."></cf-empty-state>
      <div class="table-wrap" *ngIf="!loading && data && data.items.length">
        <table class="table">
          <thead><tr><th>Product</th><th>Starting</th><th>Current bid</th><th>Bids</th><th>Starts</th><th>Ends</th><th>Status</th><th></th></tr></thead>
          <tbody><tr *ngFor="let a of data.items">
            <td><div class="cell"><img class="thumb" [src]="a.productImage | imgUrl" alt=""><strong>{{ a.productName }}</strong></div></td>
            <td>{{ a.startingPrice | money }}</td><td>{{ a.currentBid ? (a.currentBid | money) : '—' }}</td><td>{{ a.bidCount }}</td>
            <td class="muted small">{{ a.startTime | date:'MMM d, h:mm a' }}</td><td class="muted small">{{ a.endTime | date:'MMM d, h:mm a' }}</td>
            <td><cf-status [value]="a.status"></cf-status></td>
            <td class="right"><div class="row-actions">
              <a class="btn btn-outline btn-sm" [routerLink]="['/admin/auctions', a.id]">Manage</a>
              <a class="btn btn-ghost btn-sm" *ngIf="a.status === 'UPCOMING' || a.status === 'ACTIVE'" [routerLink]="['/admin/auctions', a.id, 'edit']" aria-label="Edit"><cf-icon name="edit" [size]="16"></cf-icon></a>
            </div></td>
          </tr></tbody>
        </table>
      </div>
    </div>
    <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>`,
})
export class AdminAuctionsComponent implements OnInit {
  tabs: Tab[] = ['all', 'active', 'upcoming', 'ended', 'cancelled'];
  tab: Tab = 'all';
  data: Page<Auction> | null = null;
  loading = true; error = '';
  constructor(private api: AuctionService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    const s = this.route.snapshot.queryParamMap.get('status') as Tab;
    if (s && this.tabs.indexOf(s) >= 0) { this.tab = s; }
    this.load(1);
  }
  setTab(t: Tab): void { this.tab = t; this.router.navigate([], { queryParams: { status: t === 'all' ? null : t }, replaceUrl: true }); this.load(1); }
  load(page: number): void {
    this.loading = true; this.error = '';
    this.api.list({ status: this.tab, page, limit: 12 }).subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}

// ---------------------------------------------------------------- form
const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
/** ISO -> value for <input type="datetime-local"> (local time). */
const toLocalInput = (iso: string) => { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

@Component({
  selector: 'cf-admin-auction-form',
  template: `
    <a routerLink="/admin/auctions" class="back">← Back to auctions</a>
    <div class="page-head"><div><span class="eyebrow">Auctions</span><h1>{{ id ? 'Edit auction' : 'New auction' }}</h1></div></div>
    <cf-spinner *ngIf="loading" label="Loading…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && loadError" icon="alert" title="Couldn't load this auction" [message]="loadError" actionLabel="Back" actionLink="/admin/auctions"></cf-empty-state>

    <form *ngIf="!loading && !loadError" class="panel narrow" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="alert alert-error" *ngIf="error" role="alert">{{ error }}</div>
      <div class="note" *ngIf="started">This auction has started. Only the end time can be changed.</div>
      <div class="field"><label>Product</label>
        <select class="select" formControlName="productId"><option [ngValue]="null" disabled>Select a product</option><option *ngFor="let p of products" [ngValue]="p.id">{{ p.name }} — {{ p.price | money }}</option></select>
        <span class="error" *ngIf="bad('productId')">Select a product.</span></div>
      <div class="field"><label>Starting price ($)</label><input class="input" type="number" min="0.01" step="0.01" formControlName="startingPrice"><span class="error" *ngIf="bad('startingPrice')">Enter a price above 0.</span></div>
      <div class="form-grid">
        <div class="field"><label>Start date &amp; time</label><input class="input" type="datetime-local" formControlName="startTime"><span class="error" *ngIf="bad('startTime')">Required.</span></div>
        <div class="field"><label>End date &amp; time</label><input class="input" type="datetime-local" formControlName="endTime"><span class="error" *ngIf="bad('endTime')">Required.</span></div>
      </div>
      <p class="muted small">Times are in your local time zone. Bidding is enforced by the server's clock.</p>
      <button class="btn btn-primary" type="submit" [disabled]="saving">{{ saving ? 'Saving…' : (id ? 'Save changes' : 'Create auction') }}</button>
    </form>`,
  styles: [`.narrow { max-width: 640px; } .note { padding: 12px 16px; border-radius: 12px; background: #FFF1D6; color: #7A4F00; margin-bottom: 16px; font-size: .92rem; }`],
})
export class AdminAuctionFormComponent implements OnInit {
  id = 0;
  products: Product[] = [];
  form = this.fb.group({ productId: [null, Validators.required], startingPrice: [null, [Validators.required, Validators.min(0.01)]], startTime: ['', Validators.required], endTime: ['', Validators.required] });
  loading = true; saving = false; started = false; error = ''; loadError = '';

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private api: AuctionService,
              private productApi: ProductService, private toast: ToastService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.productApi.listAdmin({ limit: 60, sort: 'name' }).subscribe(p => (this.products = p.items.filter(x => x.isAvailable)), () => {});
    if (!this.id) {
      const pre = Number(this.route.snapshot.queryParamMap.get('product')) || null;
      const start = new Date(Date.now() + 3600 * 1000), end = new Date(Date.now() + 3 * 86400 * 1000);
      this.form.patchValue({ productId: pre, startTime: toLocalInput(start.toISOString()), endTime: toLocalInput(end.toISOString()) });
      this.loading = false; return;
    }
    this.api.get(this.id).subscribe(a => {
      this.started = a.status !== 'UPCOMING';
      this.form.patchValue({ productId: a.productId, startingPrice: a.startingPrice, startTime: toLocalInput(a.startTime), endTime: toLocalInput(a.endTime) });
      if (this.started) { ['productId', 'startingPrice', 'startTime'].forEach(k => this.form.get(k).disable()); }
      this.loading = false;
    }, e => { this.loadError = e.message; this.loading = false; });
  }

  bad(n: string): boolean { const c = this.form.get(n); return c.invalid && c.touched; }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const start = new Date(v.startTime), end = new Date(v.endTime);
    if (end <= start) { this.error = 'End time must be after the start time.'; return; }
    this.saving = true; this.error = '';
    const body = { productId: v.productId, startingPrice: Number(v.startingPrice), startTime: start.toISOString(), endTime: end.toISOString() };
    const req = this.id ? this.api.update(this.id, this.started ? { endTime: body.endTime } : body) : this.api.create(body);
    req.subscribe(a => { this.toast.success(this.id ? 'Auction updated' : 'Auction created'); this.router.navigate(['/admin/auctions', a.id]); }, e => { this.saving = false; this.error = e.message; });
  }
}

// ---------------------------------------------------------------- detail
@Component({
  selector: 'cf-admin-auction-detail',
  template: `
    <a routerLink="/admin/auctions" class="back">← Back to auctions</a>
    <cf-spinner *ngIf="loading" label="Loading auction…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && !a" icon="alert" title="Couldn't load this auction" [message]="error" actionLabel="Back" actionLink="/admin/auctions"></cf-empty-state>

    <ng-container *ngIf="a">
      <div class="page-head">
        <div><span class="eyebrow">Auction #{{ a.id }}</span><h1>{{ a.productName }}</h1></div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" (click)="load()">Refresh</button>
          <a class="btn btn-outline btn-sm" *ngIf="a.status === 'UPCOMING' || a.status === 'ACTIVE'" [routerLink]="['edit']">Edit</a>
          <button class="btn btn-outline btn-sm" *ngIf="a.status === 'ACTIVE'" (click)="endNow()" [disabled]="busy">End now</button>
          <button class="btn btn-outline btn-sm" *ngIf="a.status === 'ACTIVE' || a.status === 'UPCOMING'" (click)="cancel()" [disabled]="busy">Cancel auction</button>
          <button class="btn btn-ghost btn-sm del" *ngIf="!a.bidCount" (click)="remove()" [disabled]="busy">Delete</button>
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="panel">
            <div class="panel-head"><h3>Bid history</h3><span class="muted small">{{ bids.length }} {{ bids.length === 1 ? 'bid' : 'bids' }}</span></div>
            <cf-empty-state *ngIf="!bids.length" icon="gavel" title="No bids yet" message="Bids will appear here in real time."></cf-empty-state>
            <div class="table-wrap" *ngIf="bids.length"><table class="table"><thead><tr><th>Bidder</th><th>Amount</th><th>Time</th></tr></thead>
              <tbody><tr *ngFor="let b of bids; let i = index"><td><a class="link" [routerLink]="['/admin/users', b.bidder.id]">{{ b.bidder.firstName }} {{ b.bidder.lastName }}</a><small class="small"><br>{{ b.bidder.email }}</small> <cf-status *ngIf="i === 0" [value]="a.status === 'ENDED' ? 'won' : 'winning'"></cf-status></td>
                <td><strong>{{ b.amount | money }}</strong></td><td class="muted small">{{ b.createdAt | date:'MMM d, h:mm:ss a' }}</td></tr></tbody></table></div>
          </div>
        </div>

        <aside>
          <div class="panel">
            <div class="head"><cf-status [value]="a.status"></cf-status></div>
            <img class="img" [src]="a.productImage | imgUrl" alt="">
            <dl class="kv">
              <dt>Starting price</dt><dd>{{ a.startingPrice | money }}</dd>
              <dt>Current bid</dt><dd>{{ a.currentBid ? (a.currentBid | money) : 'No bids' }}</dd>
              <dt>Starts</dt><dd>{{ a.startTime | date:'MMM d, y · h:mm a' }}</dd>
              <dt>Ends</dt><dd>{{ a.endTime | date:'MMM d, y · h:mm a' }}</dd>
              <dt *ngIf="a.status === 'ACTIVE' || a.status === 'UPCOMING'">{{ a.status === 'ACTIVE' ? 'Ends in' : 'Starts in' }}</dt>
              <dd *ngIf="a.status === 'ACTIVE' || a.status === 'UPCOMING'"><cf-countdown [compact]="true" [target]="a.status === 'ACTIVE' ? a.endTime : a.startTime" [serverTime]="a.serverTime" (finished)="load()"></cf-countdown></dd>
              <dt *ngIf="a.highestBidder && a.status === 'ACTIVE'">Leading</dt><dd *ngIf="a.highestBidder && a.status === 'ACTIVE'">{{ a.highestBidder.firstName }} {{ a.highestBidder.lastName }}</dd>
            </dl>
          </div>
          <div class="panel winner" *ngIf="a.status === 'ENDED'">
            <h3><cf-icon name="trophy" [size]="18"></cf-icon> Result</h3>
            <ng-container *ngIf="a.winner; else none"><p><strong>{{ a.winner.firstName }} {{ a.winner.lastName }}</strong><br><span class="muted">{{ a.winner.email }}</span></p><p>Winning bid: <strong>{{ a.winningBid | money }}</strong></p>
              <div class="row-actions" style="justify-content:flex-start"><a class="btn btn-outline btn-sm" routerLink="/admin/orders" [queryParams]="{ status: 'PENDING' }">View order</a><a class="btn btn-ghost btn-sm" routerLink="/admin/messages" [queryParams]="{ to: a.winner.id }">Message winner</a></div></ng-container>
            <ng-template #none><p class="muted">Ended without bids.</p></ng-template>
          </div>
        </aside>
      </div>
    </ng-container>`,
  styles: [`.img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 14px; margin: 12px 0 16px; background: var(--beige); } .del:hover { color: var(--danger); } .winner h3 { display: flex; align-items: center; gap: 8px; color: var(--success); }`],
})
export class AdminAuctionDetailComponent implements OnInit, OnDestroy {
  a: Auction | null = null;
  bids: Bid[] = [];
  loading = true; busy = false; error = '';
  private id = 0;
  private timer: any;

  constructor(private route: ActivatedRoute, private router: Router, private api: AuctionService, private toast: ToastService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(true);
    this.timer = setInterval(() => { if (this.a && (this.a.status === 'ACTIVE' || this.a.status === 'UPCOMING')) { this.refresh(); } }, 10000);
  }
  ngOnDestroy(): void { clearInterval(this.timer); }

  load(first = false): void {
    if (first) { this.loading = true; }
    this.refresh(first);
  }
  private refresh(first = false): void {
    this.api.get(this.id, !first).subscribe(a => {
      this.a = a; this.loading = false;
      this.api.bids(this.id, true).subscribe(b => (this.bids = b), () => {});
    }, e => { this.error = e.message; this.loading = false; });
  }

  endNow(): void {
    this.confirm.ask({ title: 'End this auction now?', message: 'Bidding stops immediately and the highest bidder wins. The winner is notified and an order is created.', confirmText: 'End auction', danger: true })
      .subscribe(ok => ok && this.run(this.api.endNow(this.id), 'Auction ended'));
  }
  cancel(): void {
    this.confirm.ask({ title: 'Cancel this auction?', message: 'No winner is chosen. Everyone who bid is notified.', confirmText: 'Cancel auction', cancelText: 'Keep it', danger: true })
      .subscribe(ok => ok && this.run(this.api.cancel(this.id), 'Auction cancelled'));
  }
  remove(): void {
    this.confirm.ask({ title: 'Delete this auction?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true }).subscribe(ok => {
      if (!ok) { return; }
      this.busy = true;
      this.api.remove(this.id).subscribe(() => { this.toast.success('Auction deleted'); this.router.navigate(['/admin/auctions']); }, e => { this.busy = false; this.toast.error(e.message); });
    });
  }
  private run(req: import('rxjs').Observable<Auction>, msg: string): void {
    this.busy = true;
    req.subscribe(a => { this.a = a; this.busy = false; this.toast.success(msg); this.api.bids(this.id).subscribe(b => (this.bids = b), () => {}); }, e => { this.busy = false; this.toast.error(e.message); });
  }
}

// ---------------------------------------------------------------- users
