import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, OrderStatus, Page } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private api: ApiService) {}

  /** Turns the server-side cart into an order. */
  create(shippingAddress: string): Observable<Order> { return this.api.post<Order>('/orders', { shippingAddress }); }
  get(id: number): Observable<Order> { return this.api.get<Order>('/orders/' + id); }
  /** Customers get their own orders; the admin gets everyone's (optionally filtered). */
  list(query: { status?: OrderStatus | ''; userId?: number; page?: number; limit?: number } = {}): Observable<Page<Order>> {
    return this.api.get<Page<Order>>('/orders', query);
  }
  cancel(id: number): Observable<Order> { return this.api.put<Order>('/orders/' + id + '/cancel'); }
  updateShipping(id: number, shippingAddress: string): Observable<Order> {
    return this.api.put<Order>('/orders/' + id + '/shipping-address', { shippingAddress });
  }
  /** Admin only. */
  updateStatus(id: number, body: { status?: OrderStatus; paymentStatus?: 'PENDING' | 'PAID' }): Observable<Order> {
    return this.api.put<Order>('/orders/' + id + '/status', body);
  }
}
