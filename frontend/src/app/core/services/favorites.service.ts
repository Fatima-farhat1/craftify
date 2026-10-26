import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { Product } from '../models';
import { ApiService } from './api.service';
import { SessionService } from './session.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private ids = new Set<number>();
  private idsSubject = new BehaviorSubject<number[]>([]);
  readonly ids$ = this.idsSubject.asObservable();

  constructor(private api: ApiService, private session: SessionService, private router: Router, private toast: ToastService) {
    this.session.user$
      .pipe(map(u => (u && u.role === 'USER' ? u.id : null)), distinctUntilChanged())
      .subscribe(id => {
        if (id) { this.api.get<number[]>('/favorites/ids').subscribe(list => this.set(list), () => {}); } else { this.set([]); }
      });
  }

  /** Full product objects for the favorites page. */
  list(): Observable<Product[]> { return this.api.get<Product[]>('/favorites'); }

  /** Re-sync the id set from the server (keeps hearts correct on the favorites page). */
  reload(): Observable<number[]> { return this.api.get<number[]>('/favorites/ids').pipe(tap(ids => this.set(ids))); }

  isFavorite(productId: number): boolean { return this.ids.has(productId); }

  /** Emits the new favorite state. Redirects guests to login. */
  toggle(productId: number): Observable<boolean> {
    const user = this.session.user;
    if (!user) {
      this.toast.info('Please log in to save favorites.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return of(false);
    }
    if (user.role !== 'USER') { this.toast.info('Favorites are available for customer accounts.'); return of(false); }

    const adding = !this.ids.has(productId);
    const request = adding
      ? this.api.post<{ favorited: boolean }>('/favorites/' + productId)
      : this.api.delete<{ favorited: boolean }>('/favorites/' + productId);
    return request.pipe(
      tap(() => {
        const next = new Set(this.ids);
        if (adding) { next.add(productId); } else { next.delete(productId); }
        this.set(Array.from(next));
        this.toast.success(adding ? 'Added to your favorites' : 'Removed from favorites');
      }),
      map(() => adding)
    );
  }

  private set(list: number[]): void { this.ids = new Set(list); this.idsSubject.next(list); }
}
