import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Auction, AuctionQuery, Page } from '../core/models';
import { AuctionService } from '../core/services/auction.service';

type Tab = 'active' | 'upcoming' | 'ended';

@Component({
  selector: 'cf-auction-list',
  template: `
    <section class="band"><div class="container">
      <span class="eyebrow">Bid on rare pieces</span>
      <h1><span class="live"></span> Auctions</h1>
      <p>One-of-a-kind handmade pieces, open to bids until the clock runs out.</p>
    </div></section>

    <section class="container wrap">
      <div class="top">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" *ngFor="let t of tabs" [class.on]="tab === t.key" (click)="setTab(t.key)">{{ t.label }}</button>
        </div>
        <input class="input search" type="search" [formControl]="search" placeholder="Search auctions…" aria-label="Search auctions">
      </div>

      <div class="grid-auctions" *ngIf="loading"><cf-skeleton-card *ngFor="let s of [1,2,3]"></cf-skeleton-card></div>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load auctions" [message]="error"><button class="btn btn-outline" (click)="reload()">Try again</button></cf-empty-state>

      <ng-container *ngIf="!loading && !error && result">
        <cf-empty-state *ngIf="!result.items.length" icon="gavel" [title]="emptyTitle" [message]="emptyText"
          actionLabel="Browse the shop" actionLink="/products"></cf-empty-state>
        <div class="grid-auctions" *ngIf="result.items.length"><cf-auction-card *ngFor="let a of result.items" [auction]="a"></cf-auction-card></div>
        <cf-pagination [page]="result.page" [totalPages]="result.totalPages" (pageChange)="goToPage($event)"></cf-pagination>
      </ng-container>
    </section>`,
  styles: [`
    .band { padding: 48px 0 40px; background: linear-gradient(180deg, #3A2E25, var(--ink)); color: #F6EEE3; }
    .band h1 { color: #fff; display: flex; align-items: center; gap: 14px; margin: 6px 0 8px; } .band p { color: #B5A797; margin: 0; } .band .eyebrow { color: var(--brand-300); }
    .live { width: 14px; height: 14px; border-radius: 50%; background: var(--brand-500); animation: ping 1.8s infinite; }
    @keyframes ping { 70% { box-shadow: 0 0 0 12px rgba(238,116,33,0); } 100% { box-shadow: 0 0 0 0 rgba(238,116,33,0); } }
    .wrap { padding-top: 32px; padding-bottom: 56px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
    .top .tabs { margin: 0; } .search { max-width: 280px; }
  `],
})
export class AuctionListComponent implements OnInit, OnDestroy {
  tabs: { key: Tab; label: string }[] = [{ key: 'active', label: 'Live now' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'ended', label: 'Ended' }];
  tab: Tab = 'active';
  search = new FormControl('');
  result: Page<Auction> | null = null;
  loading = true;
  error = '';
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private api: AuctionService) {}

  get emptyTitle(): string { return this.tab === 'active' ? 'No live auctions right now' : this.tab === 'upcoming' ? 'No upcoming auctions' : 'No ended auctions yet'; }
  get emptyText(): string { return this.search.value ? 'Nothing matches your search.' : 'New auctions open regularly — check back soon.'; }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      tap(p => {
        this.loading = true; this.error = '';
        const t = p.get('status');
        this.tab = t === 'upcoming' || t === 'ended' ? t : 'active';
        this.search.setValue(p.get('search') || '', { emitEvent: false });
      }),
      switchMap(p => {
        const q: AuctionQuery = { status: this.tab, search: p.get('search') || undefined, page: Number(p.get('page')) || 1, limit: 9 };
        return this.api.list(q).pipe(catchError(e => { this.error = e.message; return of(null as Page<Auction> | null); }));
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { this.result = r; this.loading = false; });

    this.search.valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(v => this.nav({ search: (v || '').trim() || null, page: null }));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setTab(t: Tab): void { this.nav({ status: t === 'active' ? null : t, page: null }); }
  goToPage(p: number): void { this.nav({ page: p > 1 ? p : null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reload(): void { this.nav({}); }
  private nav(params: { [k: string]: any }): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
  }
}
