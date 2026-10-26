import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { Cart } from '../models';
import { ApiService } from './api.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  readonly cart$ = this.cartSubject.asObservable();
  readonly count$ = this.cart$.pipe(map(c => (c ? c.itemCount : 0)));

  constructor(private api: ApiService, private session: SessionService) {
    // Load the cart whenever a customer logs in; clear it on logout.
    this.session.user$
      .pipe(map(u => (u && u.role === 'USER' ? u.id : null)), distinctUntilChanged())
      .subscribe(id => {
        if (id) { this.load().subscribe(() => {}, () => {}); } else { this.cartSubject.next(null); }
      });
  }

  load(): Observable<Cart> { return this.api.get<Cart>('/cart').pipe(tap(c => this.cartSubject.next(c))); }

  add(productId: number, quantity = 1): Observable<Cart> {
    return this.api.post<Cart>('/cart/items', { productId, quantity }).pipe(tap(c => this.cartSubject.next(c)));
  }
  setQuantity(productId: number, quantity: number): Observable<Cart> {
    return this.api.put<Cart>('/cart/items/' + productId, { quantity }).pipe(tap(c => this.cartSubject.next(c)));
  }
  remove(productId: number): Observable<Cart> {
    return this.api.delete<Cart>('/cart/items/' + productId).pipe(tap(c => this.cartSubject.next(c)));
  }
  clear(): Observable<Cart> { return this.api.delete<Cart>('/cart').pipe(tap(c => this.cartSubject.next(c))); }
}
