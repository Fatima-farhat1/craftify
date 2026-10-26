import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

/** Counts in-flight HTTP requests; drives the thin progress bar at the top of the page. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = new BehaviorSubject<number>(0);
  readonly active$ = this.pending.pipe(map(n => n > 0), distinctUntilChanged());
  start(): void { this.pending.next(this.pending.value + 1); }
  stop(): void { this.pending.next(Math.max(0, this.pending.value - 1)); }
}
