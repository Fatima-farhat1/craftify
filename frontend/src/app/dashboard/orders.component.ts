import { Component, OnInit } from '@angular/core';
import { Order, Page } from '../core/models';
import { OrderService } from '../core/services/order.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../shared/components/feedback.components';

@Component({
  selector: 'cf-my-orders',
  template: `
    <div class="page-head"><div><span class="eyebrow">Purchases</span><h1>My orders</h1></div></div>
    <cf-spinner *ngIf="loading" label="Loading orders…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your orders" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
    <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="package" title="You haven't placed any orders yet" message="Discover something handmade." actionLabel="Explore products" actionLink="/products"></cf-empty-state>

    <ng-container *ngIf="!loading && data && data.items.length">
      <article class="panel order" *ngFor="let o of data.items">
        <header>
          <div><strong>{{ o.orderNumber }}</strong><small>{{ o.createdAt | date:'medium' }}</small></div>
          <div class="st"><cf-status [value]="o.status"></cf-status><cf-status [value]="'payment ' + o.paymentStatus"></cf-status></div>
        </header>
        <div class="li" *ngFor="let i of o.items"><img class="thumb" [src]="i.image | imgUrl" alt=""><a [routerLink]="['/products', i.productId]">{{ i.name }}</a><span class="muted">× {{ i.quantity }}</span><strong>{{ i.totalPrice | money }}</strong></div>
        <footer>
          <div class="addr" *ngIf="o.shippingAddress"><cf-icon name="map-pin" [size]="15"></cf-icon> <span class="pre">{{ o.shippingAddress }}</span></div>
          <div class="addr" *ngIf="!o.shippingAddress"><a routerLink="/dashboard/won" class="link">Add a shipping address</a></div>
          <div class="tot"><span class="muted">Total</span> <strong>{{ o.totalAmount | money }}</strong>
            <button class="btn btn-outline btn-sm" *ngIf="o.status === 'PENDING'" (click)="cancel(o)" [disabled]="busy === o.id">{{ busy === o.id ? 'Cancelling…' : 'Cancel order' }}</button></div>
        </footer>
      </article>
      <cf-pagination [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>
    </ng-container>`,
  styles: [`
    .order { padding: 0; overflow: hidden; } .order + .order { margin-top: 16px; }
    header, footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; padding: 16px 22px; background: #FFFAF3; } header small { display: block; color: var(--muted); } footer { border-top: 1px solid var(--line); background: var(--white); }
    .st { display: flex; gap: 8px; flex-wrap: wrap; }
    .li { display: grid; grid-template-columns: 46px 1fr auto auto; gap: 14px; align-items: center; padding: 12px 22px; border-top: 1px solid var(--line); } .li a:hover { color: var(--brand-700); }
    .addr { display: flex; gap: 8px; align-items: flex-start; color: var(--ink-soft); font-size: .88rem; max-width: 420px; } .tot { display: flex; align-items: center; gap: 14px; font-size: 1.1rem; }
  `],
})
export class MyOrdersComponent implements OnInit {
  data: Page<Order> | null = null;
  loading = true; error = ''; busy = 0;
  constructor(private api: OrderService, private toast: ToastService, private confirm: ConfirmService) {}
  ngOnInit(): void { this.load(1); }
  load(page: number): void {
    this.loading = true; this.error = '';
    this.api.list({ page, limit: 8 }).subscribe(d => { this.data = d; this.loading = false; window.scrollTo({ top: 0 }); }, e => { this.error = e.message; this.loading = false; });
  }
  cancel(o: Order): void {
    this.confirm.ask({ title: 'Cancel order ' + o.orderNumber + '?', message: 'Your items will be released. This cannot be undone.', confirmText: 'Cancel order', cancelText: 'Keep order', danger: true }).subscribe(ok => {
      if (!ok) { return; }
      this.busy = o.id;
      this.api.cancel(o.id).subscribe(updated => { this.busy = 0; Object.assign(o, updated); this.toast.success('Order cancelled'); }, e => { this.busy = 0; this.toast.error(e.message); });
    });
  }
}
