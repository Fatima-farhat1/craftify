import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}
  list(): Observable<Category[]> { return this.api.get<Category[]>('/categories'); }
  /** form: name, description, image (optional file) */
  create(form: FormData): Observable<Category> { return this.api.post<Category>('/categories', form); }
  update(id: number, form: FormData): Observable<Category> { return this.api.put<Category>('/categories/' + id, form); }
  remove(id: number): Observable<{ deleted: boolean }> { return this.api.delete<{ deleted: boolean }>('/categories/' + id); }
}
