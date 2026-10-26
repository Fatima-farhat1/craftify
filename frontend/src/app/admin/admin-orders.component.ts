import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, OrderStatus, Page } from '../core/models';
import { OrderService } from '../core/services/order.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../shared/components/feedback.components';

const NEXT: { [s: string]: OrderStatus[] } = {
  PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [],
};

@Component({
  selector: 'cf-admin-orders',
  template: `
    <div class="page-head"><div><span class="eyebrow">Sales</span><h1>Orders</h1></div></div>
    <div class="tabs"><button class="tab" [class.on]="!status" (click)="setStatus('')">All</button>
      <button class="tab" *ngFor="let s of statuses" [class.on]="status === s" (click)="setStatus(s)">{{ s | titlecase }}</button></div>

    <div class="panel">
      <cf-spinner *ngIf="loading"></cf-spinner>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load orders" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
      <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="package" title="No orders found" message="Orders will appear here as customers check out."></cf-empty-state>

      <div class="table-wrap" *ngIf="!loading && data && data.items.length">
        <table class="table">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <ng-container *ngFor="let o of data.items">
              <tr>
                <td><strong>{{ o.orderNumber }}</strong><small class="small" *ngIf="o.auctionId"><br>Auction #{{ o.auctionId }}</small></td>
                <td>{{ o.customer?.firstName }} {{ o.customer?.lastName }}<small class="small"><br>{{ o.customer?.email }}</small></td>
                <td class="muted">{{ o.createdAt | date:'MMM d, y' }}</td><td>{{ o.totalAmount | money }}</td>
                <td><cf-status [value]="o.paymentStatus"></cf-status></td><td><cf-status [value]="o.status"></cf-status></td>
                <td class="right"><button class="btn btn-ghost btn-sm" (click)="open = open === o.id ? 0 : o.id">{{ open === o.id ? 'Hide' : 'Manage' }}</button></td>
              </tr>
              <tr class="detail" *ngIf="open === o.id"><td colspan="7">
                <div class="d">
                  <div><h4>Items</h4><div class="li" *ngFor="let i of o.items"><img class="thumb" [src]="i.image | imgUrl" alt=""><span>{{ i.name }} × {{ i.quantity }}</span><strong>{{ i.totalPrice | money }}</strong></div>
                    <h4>Ship to</h4><p class="pre">{{ o.shippingAddress || 'No address yet' }}</p></div>
                  <div class="act"><h4>Update</h4>
                    <select class="select" *ngIf="next(o).length" (change)="changeStatus(o, $event.target.value); $event.target.value = ''" [disabled]="busy === o.id">
                      <option value="">Change status…</option><option *ngFor="let s of next(o)" [value]="s">{{ s | titlecase }}</option></select>
                    <p class="muted small" *ngIf="!next(o).length">This order is {{ o.status | lowercase }} — no further changes.</p>
                    <button class="btn btn-outline btn-sm" *ngIf="o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED'" (click)="markPaid(o)" [disabled]="busy === o.id">Mark as paid</button>
                  </div>
                </div>
              </td></tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>
    <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>`,
  styles: [`
    .detail td { background: #FFFAF3; } .d { display: grid; grid-template-columns: 2fr 1fr; gap: 28px; padding: 6px 4px 10px; } h4 { font: 700 .72rem var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 8px 0; }
    .li { display: grid; grid-template-columns: 46px 1fr auto; gap: 12px; align-items: center; padding: 6px 0; } .act { display: grid; gap: 10px; align-content: start; } .act .select { max-width: 240px; }
    @media (max-width: 800px) { .d { grid-template-columns: 1fr; } }
  `],
})
export class AdminOrdersComponent implements OnInit {
  statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  status: OrderStatus | '' = '';
  data: Page<Order> | null = null;
  loading = true; error = ''; open = 0; busy = 0;

  constructor(private api: OrderService, private route: ActivatedRoute, private router: Router, private toast: ToastService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    const s = this.route.snapshot.queryParamMap.get('status') as OrderStatus;
    if (s && this.statuses.indexOf(s) >= 0) { this.status = s; }
    this.load(1);
  }

  next(o: Order): OrderStatus[] { return NEXT[o.status] || []; }
  setStatus(s: OrderStatus | ''): void { this.status = s; this.router.navigate([], { queryParams: { status: s || null }, replaceUrl: true }); this.load(1); }

  load(page: number): void {
    this.loading = true; this.error = '';
    this.api.list({ status: this.status, page, limit: 12 }).subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }

  changeStatus(o: Order, value: string): void {
    if (!value) { return; }
    const apply = () => this.run(o, { status: value as OrderStatus }, 'Order ' + o.orderNumber + ' is now ' + value.toLowerCase());
    if (value === 'CANCELLED') {
      this.confirm.ask({ title: 'Cancel order ' + o.orderNumber + '?', message: 'Items will be put back in stock and the customer will be notified.', confirmText: 'Cancel order', cancelText: 'Keep', danger: true }).subscribe(ok => ok && apply());
    } else { apply(); }
  }
  markPaid(o: Order): void { this.run(o, { paymentStatus: 'PAID' }, 'Payment recorded'); }

  private run(o: Order, body: { status?: OrderStatus; paymentStatus?: 'PENDING' | 'PAID' }, msg: string): void {
    this.busy = o.id;
    this.api.updateStatus(o.id, body).subscribe(u => { this.busy = 0; o.status = u.status; o.paymentStatus = u.paymentStatus; this.toast.success(msg); }, e => { this.busy = 0; this.toast.error(e.message); });
  }
}
