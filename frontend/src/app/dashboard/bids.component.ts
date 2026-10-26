import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MyBid, WonAuction } from '../core/models';
import { OrderService } from '../core/services/order.service';
import { ToastService } from '../core/services/toast.service';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'cf-my-bids',
  template: `
    <div class="page-head"><div><span class="eyebrow">Auctions</span><h1>My bids</h1><p>Every auction you've bid on and where you stand.</p></div></div>
    <cf-spinner *ngIf="loading" label="Loading your bids…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your bids" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>
    <cf-empty-state *ngIf="!loading && !error && !items.length" icon="gavel" title="You haven't placed any bids yet" message="Find a piece you love and make your first bid." actionLabel="Explore auctions" actionLink="/auctions"></cf-empty-state>

    <div class="panel" *ngIf="!loading && items.length">
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Auction</th><th>Your highest</th><th>Current bid</th><th>Auction</th><th>Standing</th><th>Ends</th></tr></thead>
        <tbody><tr *ngFor="let b of items">
          <td><a class="cell" [routerLink]="['/auctions', b.auctionId]"><img class="thumb" [src]="b.productImage | imgUrl" alt=""><span><strong>{{ b.productName }}</strong><small>{{ b.myBidCount }} {{ b.myBidCount === 1 ? 'bid' : 'bids' }}</small></span></a></td>
          <td>{{ b.myHighestBid | money }}</td><td>{{ b.currentBid | money }}</td>
          <td><cf-status [value]="b.status"></cf-status></td><td><cf-status [value]="b.standing"></cf-status></td>
          <td class="muted">{{ b.endTime | date:'MMM d, h:mm a' }}</td>
        </tr></tbody></table></div>
    </div>`,
})
export class MyBidsComponent implements OnInit {
  items: MyBid[] = []; loading = true; error = '';
  constructor(private api: UserService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.api.myBids().subscribe(i => { this.items = i; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}

@Component({
  selector: 'cf-won-auctions',
  template: `
    <div class="page-head"><div><span class="eyebrow">Auctions</span><h1>Won auctions</h1><p>Congratulations on your finds. Add a shipping address so we can send them.</p></div></div>
    <cf-spinner *ngIf="loading" label="Loading…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your won auctions" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>
    <cf-empty-state *ngIf="!loading && !error && !items.length" icon="trophy" title="No won auctions yet" message="Your winning bids will appear here." actionLabel="Explore auctions" actionLink="/auctions"></cf-empty-state>

    <article class="panel w" *ngFor="let w of items">
      <img class="img" [src]="w.productImage | imgUrl" [alt]="w.productName">
      <div class="body">
        <span class="eyebrow">You won</span>
        <h3><a [routerLink]="['/auctions', w.auctionId]">{{ w.productName }}</a></h3>
        <dl class="kv"><dt>Winning bid</dt><dd>{{ w.winningBid | money }}</dd><dt>Auction ended</dt><dd>{{ w.endedAt | date:'medium' }}</dd>
          <ng-container *ngIf="w.order"><dt>Order status</dt><dd><cf-status [value]="w.order.status"></cf-status></dd><dt>Payment</dt><dd><cf-status [value]="'payment ' + w.order.paymentStatus"></cf-status></dd></ng-container></dl>
        <div *ngIf="w.order && !w.order.hasShippingAddress && w.order.status === 'PENDING'" class="addr">
          <label>Shipping address</label>
          <textarea class="input" rows="3" [formControl]="addr" placeholder="Full name, street, city, country, phone"></textarea>
          <button class="btn btn-primary btn-sm" (click)="saveAddress(w)" [disabled]="saving">{{ saving ? 'Saving…' : 'Save address' }}</button>
        </div>
        <p class="muted small" *ngIf="w.order && w.order.hasShippingAddress">We'll contact you about payment and delivery.</p>
      </div>
    </article>`,
  styles: [`
    .w { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; } .w + .w { margin-top: 16px; } .img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 14px; background: var(--beige); }
    h3 { margin: 4px 0 12px; } h3 a:hover { color: var(--brand-700); } .addr { margin-top: 16px; display: grid; gap: 10px; max-width: 460px; } .addr label { font-weight: 600; font-size: .9rem; }
    @media (max-width: 640px) { .w { grid-template-columns: 1fr; } .img { max-width: 220px; } }
  `],
})
export class WonAuctionsComponent implements OnInit {
  items: WonAuction[] = []; loading = true; error = ''; saving = false;
  addr = this.fb.control('', [Validators.required, Validators.minLength(5)]);
  constructor(private fb: FormBuilder, private api: UserService, private orders: OrderService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.api.myWon().subscribe(i => { this.items = i; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
  saveAddress(w: WonAuction): void {
    if (this.addr.invalid) { this.toast.error('Please enter a full shipping address.'); return; }
    this.saving = true;
    this.orders.updateShipping(w.order.id, this.addr.value.trim()).subscribe(
      () => { this.saving = false; w.order.hasShippingAddress = true; this.addr.reset(''); this.toast.success('Shipping address saved'); },
      e => { this.saving = false; this.toast.error(e.message); });
  }
}
