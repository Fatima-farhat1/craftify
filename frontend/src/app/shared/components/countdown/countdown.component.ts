import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Subscription, interval } from 'rxjs';

/**
 * Live countdown to `target`. Pass `serverTime` (from the API) so the timer follows the SERVER clock
 * even if the visitor's device clock is wrong. This is only a display: the backend enforces the real end time.
 */
@Component({
  selector: 'cf-countdown',
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss'],
})
export class CountdownComponent implements OnChanges, OnDestroy {
  @Input() target: string;
  @Input() serverTime: string;
  @Input() compact = false;
  @Output() finished = new EventEmitter<void>();

  days = 0; hours = 0; minutes = 0; seconds = 0;
  done = false;

  private offset = 0; // serverNow - deviceNow
  private sub: Subscription;
  private emitted = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.offset = this.serverTime ? new Date(this.serverTime).getTime() - Date.now() : 0;
    this.emitted = false;
    this.stop();
    this.tick();
    if (!this.done) { this.sub = interval(1000).subscribe(() => this.tick()); }
  }

  ngOnDestroy(): void { this.stop(); }

  pad(n: number): string { return n < 10 ? '0' + n : String(n); }

  private tick(): void {
    const remaining = Math.max(0, new Date(this.target).getTime() - (Date.now() + this.offset));
    const total = Math.floor(remaining / 1000);
    this.days = Math.floor(total / 86400);
    this.hours = Math.floor((total % 86400) / 3600);
    this.minutes = Math.floor((total % 3600) / 60);
    this.seconds = total % 60;
    this.done = remaining <= 0;
    if (this.done) {
      this.stop();
      if (!this.emitted) { this.emitted = true; this.finished.emit(); }
    }
    this.cdr.markForCheck();
  }

  private stop(): void { if (this.sub) { this.sub.unsubscribe(); this.sub = undefined; } }
}
