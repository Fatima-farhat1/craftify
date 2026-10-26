import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cf-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pg" *ngIf="totalPages > 1" aria-label="Pagination">
      <button type="button" (click)="go(page - 1)" [disabled]="page <= 1" aria-label="Previous page">‹</button>
      <ng-container *ngFor="let p of pages">
        <span *ngIf="p === 0" class="gap">…</span>
        <button *ngIf="p > 0" type="button" [class.on]="p === page" (click)="go(p)" [attr.aria-current]="p === page ? 'page' : null">{{ p }}</button>
      </ng-container>
      <button type="button" (click)="go(page + 1)" [disabled]="page >= totalPages" aria-label="Next page">›</button>
    </nav>`,
  styles: [`
    .pg { display: flex; justify-content: center; gap: 6px; margin-top: 40px; flex-wrap: wrap; }
    button { min-width: 42px; height: 42px; padding: 0 12px; border: 1.5px solid var(--line); border-radius: 12px; background: var(--white); font: inherit; font-weight: 600; color: var(--ink-soft); transition: all .2s; }
    button:hover:not([disabled]):not(.on) { border-color: var(--brand-300); color: var(--brand-700); }
    button.on { background: var(--brand-600); border-color: var(--brand-600); color: #fff; }
    button[disabled] { opacity: .4; cursor: default; }
    .gap { align-self: center; color: var(--muted); padding: 0 4px; }
  `],
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  /** 0 = ellipsis. Shows first, last and a window around the current page. */
  get pages(): number[] {
    const out: number[] = [];
    for (let p = 1; p <= this.totalPages; p++) {
      if (p === 1 || p === this.totalPages || Math.abs(p - this.page) <= 1) { out.push(p); }
      else if (out[out.length - 1] !== 0) { out.push(0); }
    }
    return out;
  }
  go(p: number): void { if (p >= 1 && p <= this.totalPages && p !== this.page) { this.pageChange.emit(p); } }
}

@Component({
  selector: 'cf-quantity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="q" [class.disabled]="disabled">
      <button type="button" (click)="set(value - 1)" [disabled]="disabled || value <= min" aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{{ value }}</span>
      <button type="button" (click)="set(value + 1)" [disabled]="disabled || value >= max" aria-label="Increase quantity">+</button>
    </div>`,
  styles: [`
    .q { display: inline-flex; align-items: center; border: 1.5px solid var(--line); border-radius: 999px; background: var(--white); }
    button { width: 40px; height: 42px; border: 0; background: transparent; font-size: 1.2rem; color: var(--ink-soft); border-radius: 999px; }
    button:hover:not([disabled]) { color: var(--brand-700); background: var(--brand-50); } button[disabled] { opacity: .35; cursor: default; }
    span { min-width: 34px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
  `],
})
export class QuantityComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<number>();
  set(v: number): void { const n = Math.min(this.max, Math.max(this.min, v)); if (n !== this.value) { this.valueChange.emit(n); } }
}

/** Main image + thumbnails. `images` are API paths (or null entries render the placeholder). */
@Component({
  selector: 'cf-gallery',
  template: `
    <div class="g">
      <div class="main"><img [src]="current | imgUrl" [alt]="alt"></div>
      <div class="thumbs" *ngIf="images.length > 1">
        <button type="button" *ngFor="let img of images; let i = index" [class.on]="i === index" (click)="index = i" [attr.aria-label]="'Show image ' + (i + 1)">
          <img [src]="img | imgUrl" alt="">
        </button>
      </div>
    </div>`,
  styles: [`
    .main { aspect-ratio: 1 / 1; border-radius: var(--radius-lg); overflow: hidden; background: var(--beige); border: 1px solid var(--line); }
    .main img { width: 100%; height: 100%; object-fit: cover; }
    .thumbs { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .thumbs button { width: 72px; height: 72px; padding: 0; border: 2px solid transparent; border-radius: 12px; overflow: hidden; background: var(--beige); opacity: .75; transition: all .2s; }
    .thumbs button.on, .thumbs button:hover { border-color: var(--brand-500); opacity: 1; }
    .thumbs img { width: 100%; height: 100%; object-fit: cover; }
  `],
})
export class GalleryComponent {
  @Input() images: string[] = [];
  @Input() alt = '';
  index = 0;
  get current(): string | null { return this.images.length ? this.images[Math.min(this.index, this.images.length - 1)] : null; }
}
