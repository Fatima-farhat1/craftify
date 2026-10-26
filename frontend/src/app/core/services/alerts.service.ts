import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SessionService } from './session.service';

/** Unread notification / message counters for the header badges (polled every minute while logged in). */
@Injectable({ providedIn: 'root' })
export class AlertsService {
  readonly notifications$ = new BehaviorSubject<number>(0);
  readonly messages$ = new BehaviorSubject<number>(0);

  constructor(private api: ApiService, private session: SessionService) {
    this.session.user$
      .pipe(
        map(u => (u ? u.id : null)),
        distinctUntilChanged(),
        switchMap(id => (id ? timer(0, 60000).pipe(switchMap(() => this.fetch())) : of({ n: 0, m: 0 })))
      )
      .subscribe(c => { this.notifications$.next(c.n); this.messages$.next(c.m); });
  }

  refresh(): void { this.fetch().subscribe(c => { this.notifications$.next(c.n); this.messages$.next(c.m); }); }

  private fetch() {
    return forkJoin([
      this.api.get<{ unreadCount: number }>('/notifications/unread-count', {}, { background: true }),
      this.api.get<{ unreadCount: number }>('/messages/unread-count', {}, { background: true }),
    ]).pipe(
      map(([n, m]) => ({ n: n.unreadCount, m: m.unreadCount })),
      catchError(() => of({ n: 0, m: 0 }))
    );
  }
}
