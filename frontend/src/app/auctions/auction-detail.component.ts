import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, EMPTY, forkJoin, of, timer } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Auction, Bid } from '../core/models';
import { ApiError } from '../core/interceptors/error.interceptor';
import { AuctionService } from '../core/services/auction.service';
import { SessionService } from '../core/services/session.service';
import { ToastService } from '../core/services/toast.service';
import { MoneyPipe } from '../shared/pipes/money.pipe';

@Component({ selector: 'cf-auction-detail', templateUrl: './auction-detail.component.html', styleUrls: ['./auction-detail.component.scss'] })
export class AuctionDetailComponent implements OnInit, OnDestroy {
  auction: Auction | null = null;
  bids: Bid[] = [];
  loading = true;
  error = '';
  notFound = false;

  amount = new FormControl('');
  submitting = false;
  bidError = '';
  quickAdds = [5, 10, 25];

  private id = 0;
  private money = new MoneyPipe();
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private api: AuctionService,
              public session: SessionService, private toast: ToastService) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      tap(p => { this.id = Number(p.get('id')); this.loading = true; this.error = ''; this.notFound = false; this.auction = null; this.bids = []; this.bidError = ''; }),
      switchMap(() => forkJoin([this.api.get(this.id), this.api.bids(this.id)]).pipe(
        catchError(e => { this.error = e.message; this.notFound = e.status === 404; return of(null); })
      )),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.loading = false;
      if (res) { this.setAuction(res[0], true); this.bids = res[1]; }
    });

    // Live updates: refresh every 8s while the auction is open (background requests, no loading bar).
    timer(8000, 8000).pipe(
      filter(() => !!this.auction && !this.submitting && (this.auction.status === 'ACTIVE' || this.auction.status === 'UPCOMING')),
      switchMap(() => forkJoin([this.api.get(this.id, true), this.api.bids(this.id, true)]).pipe(catchError(() => EMPTY))),
      takeUntil(this.destroy$)
    ).subscribe(res => { this.setAuction(res[0]); this.bids = res[1]; });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ----- derived state -----
  get user() { return this.session.user; }
  get gallery(): string[] {
    const a = this.auction;
    if (!a) { return []; }
    if (a.images && a.images.length) { return a.images.map(i => i.url); }
    return a.productImage ? [a.productImage] : [];
  }
  get canBid(): boolean { return !!this.auction && this.auction.status === 'ACTIVE' && !!this.user && this.user.role === 'USER' && !this.auction.isLeading; }
  get priceLabel(): string {
    const a = this.auction;
    if (a.status === 'ENDED') { return a.winningBid ? 'Winning bid' : 'Final status'; }
    if (a.status === 'UPCOMING') { return 'Starting price'; }
    return a.bidCount > 0 ? 'Current bid' : 'Starting bid';
  }

  // ----- actions -----
  placeBid(): void {
    const a = this.auction;
    const value = Number(this.amount.value);
    this.bidError = '';
    if (!this.amount.value || !isFinite(value) || value <= 0) { this.bidError = 'Enter a valid bid amount.'; return; }
    if (Math.round(value * 100) / 100 !== value) { this.bidError = 'A bid can have at most 2 decimal places.'; return; }
    if (value < a.minNextBid) { this.bidError = 'Your bid must be at least ' + this.money.transform(a.minNextBid) + '.'; return; }

    this.submitting = true;
    this.api.placeBid(this.id, value).subscribe(
      res => {
        this.submitting = false;
        this.setAuction(res.auction);
        this.amount.reset(this.auction.minNextBid);
        this.toast.success('Bid placed — you are the highest bidder!');
        this.api.bids(this.id).subscribe(b => (this.bids = b), () => {});
      },
      (e: ApiError) => {
        this.submitting = false;
        this.bidError = e.message;        // the server is the judge: show exactly why it was rejected
        this.refresh();                   // …and pick up the newest price
      }
    );
  }

  quick(increment: number): void { this.amount.setValue(Math.round((this.auction.currentPrice + increment) * 100) / 100); this.amount.markAsDirty(); }

  /** Called when the countdown reaches zero, and after a rejected bid. */
  refresh(): void {
    forkJoin([this.api.get(this.id, true), this.api.bids(this.id, true)]).pipe(catchError(() => EMPTY))
      .subscribe(res => { this.setAuction(res[0]); this.bids = res[1]; });
  }

  private setAuction(a: Auction, first = false): void {
    this.auction = { ...(this.auction || {} as Auction), ...a };   // keep images when a response doesn't include them
    if (first || !this.amount.dirty) { this.amount.setValue(this.auction.minNextBid); }
  }
}
