import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, Product, ProductQuery } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  list(query: ProductQuery = {}): Observable<Page<Product>> { return this.api.get<Page<Product>>('/products', query); }
  get(id: number): Observable<Product> { return this.api.get<Product>('/products/' + id); }

  // ---- admin (the backend rejects these for non-admins) ----
  /** Includes disabled products. */
  listAdmin(query: ProductQuery = {}): Observable<Page<Product>> {
    return this.api.get<Page<Product>>('/products', { ...query, includeUnavailable: true });
  }
  /** form: name, categoryId, price, stockQuantity, description, isFeatured, isAvailable, images[] */
  create(form: FormData): Observable<Product> { return this.api.post<Product>('/products', form); }
  update(id: number, form: FormData): Observable<Product> { return this.api.put<Product>('/products/' + id, form); }
  remove(id: number): Observable<{ deleted: boolean }> { return this.api.delete<{ deleted: boolean }>('/products/' + id); }
  removeImage(id: number, imageId: number): Observable<Product> { return this.api.delete<Product>('/products/' + id + '/images/' + imageId); }
  setPrimaryImage(id: number, imageId: number): Observable<Product> { return this.api.put<Product>('/products/' + id + '/images/' + imageId + '/primary'); }
}
