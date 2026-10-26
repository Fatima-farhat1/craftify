import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Product } from '../core/models';
import { CartService } from '../core/services/cart.service';
import { FavoritesService } from '../core/services/favorites.service';
import { ProductService } from '../core/services/product.service';
import { SessionService } from '../core/services/session.service';
import { ToastService } from '../core/services/toast.service';

@Component({ selector: 'cf-product-detail', templateUrl: './product-detail.component.html', styleUrls: ['./product-detail.component.scss'] })
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  related: Product[] = [];
  loading = true;
  error = '';
  notFound = false;
  quantity = 1;
  adding = false;
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private productApi: ProductService, private cart: CartService,
              public favorites: FavoritesService, private session: SessionService, private toast: ToastService) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      tap(() => { this.loading = true; this.error = ''; this.notFound = false; this.quantity = 1; this.related = []; }),
      switchMap(p => this.productApi.get(Number(p.get('id'))).pipe(
        catchError(e => { this.error = e.message; this.notFound = e.status === 404; return of(null as Product | null); })
      )),
      takeUntil(this.destroy$)
    ).subscribe(p => {
      this.product = p;
      this.loading = false;
      if (p) { this.loadRelated(p); }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get gallery(): string[] {
    const p = this.product;
    if (!p) { return []; }
    if (p.images && p.images.length) { return p.images.map(i => i.url); }
    return p.image ? [p.image] : [];
  }
  get maxQty(): number { return this.product ? Math.max(1, Math.min(this.product.stockQuantity, 20)) : 1; }
  get lowStock(): boolean { return !!this.product && this.product.stockQuantity > 0 && this.product.stockQuantity <= 3; }

  addToCart(): void {
    const user = this.session.user;
    if (!user) {
      this.toast.info('Please log in to add items to your cart.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (user.role !== 'USER') { this.toast.info('The admin account cannot place orders.'); return; }
    this.adding = true;
    this.cart.add(this.product.id, this.quantity).subscribe(
      () => { this.adding = false; this.toast.success('Added to your cart'); },
      e => { this.adding = false; this.toast.error(e.message); }
    );
  }

  toggleFavorite(): void { this.favorites.toggle(this.product.id).subscribe(() => {}, () => {}); }

  private loadRelated(p: Product): void {
    this.productApi.list({ category: p.categoryId, limit: 5 }).subscribe(
      page => (this.related = page.items.filter(x => x.id !== p.id).slice(0, 4)), () => {});
  }
}
