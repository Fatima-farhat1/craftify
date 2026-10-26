import { Component, OnInit } from '@angular/core';
import { NgModule } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Order } from '../core/models';
import { CartService } from '../core/services/cart.service';
import { OrderService } from '../core/services/order.service';
import { SessionService } from '../core/services/session.service';
import { ToastService } from '../core/services/toast.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'cf-checkout',
  template: `
    <section class="container wrap">
      <a routerLink="/cart" class="back">← Back to cart</a>
      <div class="page-head"><div><span class="eyebrow">Almost there</span><h1>Checkout</h1></div></div>

      <cf-spinner *ngIf="loading" label="Preparing checkout…"></cf-spinner>

      <ng-container *ngIf="!loading && (cart.cart$ | async) as c">
        <div class="layout" *ngIf="c.items.length">
          <form class="panel" [formGroup]="form" (ngSubmit)="place()" novalidate>
            <h3>Shipping address</h3>
            <div class="alert alert-error" *ngIf="error" role="alert">{{ error }} <a routerLink="/cart" class="link" *ngIf="stockProblem">Review your cart</a></div>
            <div class="field">
              <label for="addr">Where should we send your order?</label>
              <textarea id="addr" class="textarea input" rows="4" formControlName="shippingAddress" placeholder="Full name, street, city, country, phone"
                        [class.invalid]="form.get('shippingAddress').invalid && form.get('shippingAddress').touched"></textarea>
              <span class="error" *ngIf="form.get('shippingAddress').invalid && form.get('shippingAddress').touched">Please enter a full shipping address.</span>
            </div>

            <h3>Payment</h3>
            <div class="pay"><cf-icon name="package" [size]="20"></cf-icon>
              <div><strong>Pay later</strong><p>Online payment is coming soon. Your order is recorded as <em>payment pending</em> and we'll contact you to complete it.</p></div></div>

            <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="placing || !c.canCheckout">{{ placing ? 'Placing your order…' : 'Place order · ' }}<span *ngIf="!placing">{{ c.total | money }}</span></button>
          </form>

          <aside class="panel">
            <h3>Order summary</h3>
            <div class="li" *ngFor="let i of c.items"><img [src]="i.image | imgUrl" alt=""><div><strong>{{ i.name }}</strong><small>Qty {{ i.quantity }}</small></div><span>{{ i.lineTotal | money }}</span></div>
            <div class="row total"><span>Total</span><span>{{ c.total | money }}</span></div>
          </aside>
        </div>
      </ng-container>
    </section>`,
  styles: [`
    .wrap { padding-top: 32px; padding-bottom: 64px; } .layout { display: grid; grid-template-columns: 1fr 380px; gap: 28px; align-items: start; }
    h3 { margin-bottom: 14px; } .textarea { resize: vertical; } .input.invalid { border-color: var(--danger); }
    .pay { display: flex; gap: 14px; padding: 16px; border-radius: 14px; background: var(--brand-50); color: var(--brand-800); margin: 4px 0 24px; } .pay p { margin: 2px 0 0; font-size: .9rem; color: var(--ink-soft); }
    .li { display: grid; grid-template-columns: 52px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); } .li img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; } .li small { display: block; color: var(--muted); }
    .row.total { display: flex; justify-content: space-between; margin-top: 16px; font-size: 1.25rem; font-weight: 700; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `],
})
export class CheckoutComponent implements OnInit {
  form = this.fb.group({ shippingAddress: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]] });
  loading = true;
  placing = false;
  error = '';
  stockProblem = false;

  constructor(private fb: FormBuilder, public cart: CartService, private orders: OrderService, private router: Router,
              private session: SessionService, private toast: ToastService) {}

  ngOnInit(): void {
    const saved = this.session.user && this.session.user.address;
    if (saved) { this.form.patchValue({ shippingAddress: saved }); }
    this.cart.load().subscribe(c => {
      this.loading = false;
      if (!c.items.length) { this.router.navigate(['/cart']); }
    }, e => { this.loading = false; this.error = e.message; });
  }

  place(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.placing = true;
    this.error = '';
    this.orders.create(this.form.value.shippingAddress.trim()).subscribe(
      order => {
        this.cart.load().subscribe(() => {}, () => {});    // the server emptied the cart
        this.toast.success('Order placed!');
        this.router.navigate(['/checkout/success', order.id]);
      },
      e => { this.placing = false; this.error = e.message; this.stockProblem = e.status === 409; }
    );
  }
}

@Component({
  selector: 'cf-order-success',
  template: `
    <section class="container wrap">
      <cf-spinner *ngIf="loading" label="Loading your order…"></cf-spinner>
      <cf-empty-state *ngIf="!loading && !order" icon="alert" title="Order not found" [message]="error" actionLabel="Go home" actionLink="/"></cf-empty-state>
      <div class="box panel" *ngIf="order">
        <span class="tick"><cf-icon name="check" [size]="34" [stroke]="2.4"></cf-icon></span>
        <h1>Thank you for your order!</h1>
        <p class="muted">Order <strong>{{ order.orderNumber }}</strong> has been received. We'll confirm it shortly.</p>
        <div class="items"><div class="li" *ngFor="let i of order.items"><img [src]="i.image | imgUrl" alt=""><span>{{ i.name }} × {{ i.quantity }}</span><strong>{{ i.totalPrice | money }}</strong></div></div>
        <div class="tot"><span>Total</span><strong>{{ order.totalAmount | money }}</strong></div>
        <dl class="kv"><dt>Status</dt><dd><cf-status [value]="order.status"></cf-status> <cf-status [value]="'payment ' + order.paymentStatus"></cf-status></dd><dt>Ship to</dt><dd class="pre">{{ order.shippingAddress }}</dd></dl>
        <div class="cta"><a class="btn btn-primary" routerLink="/dashboard/orders">View my orders</a><a class="btn btn-outline" routerLink="/products">Continue shopping</a></div>
      </div>
    </section>`,
  styles: [`
    .wrap { padding-top: 48px; padding-bottom: 72px; } .box { max-width: 640px; margin: 0 auto; text-align: center; padding: 40px 36px; }
    .tick { display: inline-grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; background: #E3F4EA; color: var(--success); margin-bottom: 18px; }
    .items { text-align: left; margin: 24px 0 0; } .li { display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); } .li img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; }
    .tot { display: flex; justify-content: space-between; padding: 14px 0; font-size: 1.2rem; } .kv { text-align: left; margin: 8px 0 24px; } .cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `],
})
export class OrderSuccessComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error = '';
  constructor(private route: ActivatedRoute, private orders: OrderService) {}
  ngOnInit(): void {
    this.orders.get(Number(this.route.snapshot.paramMap.get('id'))).subscribe(
      o => { this.order = o; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}

@NgModule({
  declarations: [CheckoutComponent, OrderSuccessComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: '', component: CheckoutComponent },
    { path: 'success/:id', component: OrderSuccessComponent },
  ])],
})
export class CheckoutModule {}
