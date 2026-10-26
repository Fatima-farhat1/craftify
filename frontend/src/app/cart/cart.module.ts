import { Component, OnInit } from '@angular/core';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartItem } from '../core/models';
import { CartService } from '../core/services/cart.service';
import { ToastService } from '../core/services/toast.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'cf-cart',
  template: `
    <section class="container wrap">
      <div class="page-head"><div><span class="eyebrow">Your basket</span><h1>Shopping cart</h1></div></div>

      <cf-spinner *ngIf="loading" label="Loading your cart…"></cf-spinner>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load your cart" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>

      <ng-container *ngIf="!loading && !error && (cart.cart$ | async) as c">
        <cf-empty-state *ngIf="!c.items.length" icon="bag" title="Your cart is empty" message="Discover something handmade." actionLabel="Explore products" actionLink="/products"></cf-empty-state>

        <div class="layout" *ngIf="c.items.length">
          <div class="items">
            <article class="item panel" *ngFor="let i of c.items; trackBy: track" [class.busy]="busy[i.productId]">
              <a [routerLink]="['/products', i.productId]" class="img"><img [src]="i.image | imgUrl" [alt]="i.name"></a>
              <div class="mid">
                <span class="cat">{{ i.categoryName }}</span>
                <a [routerLink]="['/products', i.productId]" class="name">{{ i.name }}</a>
                <span class="unit">{{ i.unitPrice | money }} each</span>
                <span class="issue" *ngIf="i.issue"><cf-icon name="alert" [size]="14"></cf-icon> {{ i.issue }}</span>
                <button type="button" class="rm" (click)="remove(i)">Remove</button>
              </div>
              <div class="end">
                <cf-quantity [value]="i.quantity" [max]="maxFor(i)" [disabled]="busy[i.productId]" (valueChange)="setQty(i, $event)"></cf-quantity>
                <strong class="line">{{ i.lineTotal | money }}</strong>
              </div>
            </article>
          </div>

          <aside class="summary panel">
            <h3>Order summary</h3>
            <div class="row"><span>Subtotal ({{ c.itemCount }} {{ c.itemCount === 1 ? 'item' : 'items' }})</span><span>{{ c.subtotal | money }}</span></div>
            <div class="row"><span>Shipping</span><span class="muted">Confirmed after order</span></div>
            <div class="row total"><span>Total</span><span>{{ c.total | money }}</span></div>
            <a class="btn btn-primary btn-lg btn-block" routerLink="/checkout" [class.disabled]="!c.canCheckout">Proceed to checkout</a>
            <p class="hint" *ngIf="!c.canCheckout">Fix the highlighted items to continue.</p>
            <a routerLink="/products" class="link cont">← Continue shopping</a>
          </aside>
        </div>
      </ng-container>
    </section>`,
  styles: [`
    .wrap { padding-top: 40px; padding-bottom: 64px; }
    .layout { display: grid; grid-template-columns: 1fr 360px; gap: 28px; align-items: start; }
    .items { display: grid; gap: 14px; }
    .item { display: grid; grid-template-columns: 110px 1fr auto; gap: 20px; padding: 16px; align-items: center; transition: opacity .2s; } .item + .item { margin-top: 0; } .item.busy { opacity: .55; }
    .img { aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: var(--beige); } .img img { width: 100%; height: 100%; object-fit: cover; }
    .mid { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .cat { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
    .name { font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; } .name:hover { color: var(--brand-700); }
    .unit { color: var(--muted); font-size: .88rem; }
    .issue { display: inline-flex; align-items: center; gap: 6px; color: var(--danger); font-size: .85rem; font-weight: 600; }
    .rm { align-self: flex-start; border: 0; background: none; padding: 4px 0; color: var(--muted); font-size: .85rem; text-decoration: underline; } .rm:hover { color: var(--danger); }
    .end { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; } .line { font-size: 1.15rem; }
    .summary { position: sticky; top: calc(var(--header-h) + 16px); }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; color: var(--ink-soft); } .row.total { border-top: 1px solid var(--line); margin: 8px 0 18px; padding-top: 16px; font-size: 1.25rem; font-weight: 700; color: var(--ink); }
    .hint { color: var(--danger); font-size: .85rem; text-align: center; margin: 10px 0 0; } .cont { display: block; text-align: center; margin-top: 16px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .summary { position: static; } }
    @media (max-width: 560px) { .item { grid-template-columns: 80px 1fr; } .end { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; } }
  `],
})
export class CartComponent implements OnInit {
  loading = true;
  error = '';
  busy: { [productId: number]: boolean } = {};

  constructor(public cart: CartService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.cart.load().subscribe(() => (this.loading = false), e => { this.error = e.message; this.loading = false; });
  }
  track(_: number, i: CartItem): number { return i.productId; }
  maxFor(i: CartItem): number { return Math.max(1, Math.min(i.stockQuantity, 99)); }

  setQty(i: CartItem, q: number): void {
    this.busy[i.productId] = true;
    this.cart.setQuantity(i.productId, q).subscribe(() => (this.busy[i.productId] = false), e => { this.busy[i.productId] = false; this.toast.error(e.message); });
  }
  remove(i: CartItem): void {
    this.busy[i.productId] = true;
    this.cart.remove(i.productId).subscribe(() => { this.busy[i.productId] = false; this.toast.info('Removed from your cart'); },
      e => { this.busy[i.productId] = false; this.toast.error(e.message); });
  }
}

@NgModule({
  declarations: [CartComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: CartComponent }])],
})
export class CartModule {}
