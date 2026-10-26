import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Notification, NotificationPage, Product } from '../core/models';
import { FavoritesService } from '../core/services/favorites.service';
import { NotificationService } from '../core/services/notification.service';
import { ToastService } from '../core/services/toast.service';
import { switchMap } from 'rxjs/operators';

const ICONS: { [type: string]: string } = {
  AUCTION_WON: 'trophy', AUCTION_LOST: 'gavel', AUCTION_ENDING_SOON: 'clock', NEW_MESSAGE: 'mail',
  ORDER_CONFIRMED: 'package', ORDER_SHIPPED: 'package', ORDER_DELIVERED: 'package', GENERAL: 'bell',
};

@Component({
  selector: 'cf-notifications',
  template: `
    <div class="page-head"><div><span class="eyebrow">Activity</span><h1>Notifications</h1></div>
      <button class="btn btn-outline btn-sm" *ngIf="data && data.unreadCount" (click)="markAll()">Mark all as read</button></div>

    <cf-spinner *ngIf="loading" label="Loading…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load notifications" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
    <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="bell" title="You're all caught up" message="Order updates, bids and messages will show up here."></cf-empty-state>

    <div class="panel list" *ngIf="!loading && data && data.items.length">
      <button type="button" class="n" *ngFor="let n of data.items" [class.unread]="!n.isRead" (click)="open(n)">
        <span class="ic"><cf-icon [name]="icon(n.type)" [size]="18"></cf-icon></span>
        <span class="t"><strong>{{ n.title }}</strong><span class="b" *ngIf="n.body">{{ n.body }}</span><small>{{ n.createdAt | date:'MMM d, h:mm a' }}</small></span>
        <span class="dot" *ngIf="!n.isRead"></span>
      </button>
    </div>
    <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>`,
  styles: [`
    .list { padding: 8px; } .n { display: flex; gap: 14px; align-items: flex-start; width: 100%; padding: 14px; border: 0; border-radius: 12px; background: none; font: inherit; text-align: left; border-bottom: 1px solid var(--line); } .n:last-child { border-bottom: 0; } .n:hover { background: #FFFAF3; } .n.unread { background: #FFF8EF; }
    .ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--brand-50); color: var(--brand-600); flex-shrink: 0; }
    .t { display: flex; flex-direction: column; gap: 2px; flex: 1; } .b { color: var(--ink-soft); font-size: .92rem; } small { color: var(--muted); } .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand-600); margin-top: 6px; }
  `],
})
export class NotificationsComponent implements OnInit {
  data: NotificationPage | null = null;
  loading = true; error = '';
  constructor(private api: NotificationService, private router: Router, private toast: ToastService) {}
  ngOnInit(): void { this.load(1); }
  icon(type: string): string { return ICONS[type] || 'bell'; }
  load(page: number): void {
    this.loading = true; this.error = '';
    this.api.list({ page, limit: 15 }).subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
  open(n: Notification): void {
    if (!n.isRead) { n.isRead = true; this.api.markRead(n.id).subscribe(() => {}, () => {}); }
    if (n.relatedType === 'AUCTION' && n.relatedId) { this.router.navigate(['/auctions', n.relatedId]); }
    else if (n.relatedType === 'ORDER') { this.router.navigate(['/dashboard/orders']); }
    else if (n.relatedType === 'MESSAGE') { this.router.navigate(['/dashboard/messages']); }
  }
  markAll(): void {
    this.api.markAllRead().subscribe(() => { this.data.items.forEach(n => (n.isRead = true)); this.data.unreadCount = 0; this.toast.success('All caught up'); }, e => this.toast.error(e.message));
  }
}

@Component({
  selector: 'cf-favorites',
  template: `
    <div class="page-head"><div><span class="eyebrow">Wishlist</span><h1>My favorites</h1></div></div>
    <div class="grid-cards" *ngIf="loading"><cf-skeleton-card *ngFor="let s of [1,2,3]"></cf-skeleton-card></div>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your favorites" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>
    <cf-empty-state *ngIf="!loading && !error && !visible.length" icon="heart" title="Your wishlist is empty" message="Discover something handmade." actionLabel="Explore products" actionLink="/products"></cf-empty-state>
    <div class="grid-cards" *ngIf="!loading && visible.length"><cf-product-card *ngFor="let p of visible" [product]="p"></cf-product-card></div>`,
  styles: [`.grid-cards { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }`],
})
export class FavoritesComponent implements OnInit {
  items: Product[] = [];
  loading = true; error = '';
  constructor(private favorites: FavoritesService) {}
  /** Hides a card as soon as its heart is un-toggled. */
  get visible(): Product[] { return this.items.filter(p => this.favorites.isFavorite(p.id)); }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.favorites.reload().pipe(switchMap(() => this.favorites.list())).subscribe(
      items => { this.items = items; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}
