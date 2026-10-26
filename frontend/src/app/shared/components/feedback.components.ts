import { ChangeDetectionStrategy, Component, Inject, Injectable, Input } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Centered spinner with an optional label, e.g. <cf-spinner label="Loading auction…"> */
@Component({
  selector: 'cf-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="wrap" role="status"><span class="ring"></span><span *ngIf="label" class="lbl">{{ label }}</span></div>`,
  styles: [`
    .wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 48px 16px; color: var(--muted); }
    .ring { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--brand-100); border-top-color: var(--brand-600); animation: spin .8s linear infinite; }
    .lbl { font-size: .9rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SpinnerComponent { @Input() label = ''; }

/** Placeholder shaped like a product/auction card while data loads. */
@Component({
  selector: 'cf-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk">
      <div class="skeleton img"></div>
      <div class="skeleton l1"></div><div class="skeleton l2"></div><div class="skeleton l3"></div>
    </div>`,
  styles: [`
    .sk { background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 12px; }
    .img { aspect-ratio: 4 / 5; border-radius: 14px; margin-bottom: 14px; }
    .l1 { height: 12px; width: 40%; margin-bottom: 10px; } .l2 { height: 18px; width: 80%; margin-bottom: 14px; } .l3 { height: 36px; width: 100%; border-radius: 999px; }
  `],
})
export class SkeletonCardComponent {}

/** Friendly empty/error state. Pass an action link, or project your own buttons inside. */
@Component({
  selector: 'cf-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <span class="ico"><cf-icon [name]="icon" [size]="30"></cf-icon></span>
      <h3>{{ title }}</h3>
      <p *ngIf="message">{{ message }}</p>
      <a *ngIf="actionLabel && actionLink" class="btn btn-primary" [routerLink]="actionLink">{{ actionLabel }}</a>
      <ng-content></ng-content>
    </div>`,
  styles: [`
    .empty { text-align: center; padding: 56px 20px; max-width: 460px; margin: 0 auto; }
    .ico { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; background: var(--brand-50); color: var(--brand-600); margin-bottom: 18px; }
    h3 { font-size: 1.35rem; margin-bottom: 6px; } p { color: var(--muted); margin-bottom: 22px; }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'package';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionLink: string | any[] = '';
}

export interface ConfirmOptions { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean; }

@Component({
  selector: 'cf-confirm-dialog',
  template: `
    <h2 class="t">{{ data.title }}</h2>
    <p class="m">{{ data.message }}</p>
    <div class="actions">
      <button class="btn btn-ghost" (click)="ref.close(false)">{{ data.cancelText || 'Cancel' }}</button>
      <button class="btn" [ngClass]="data.danger ? 'btn-danger' : 'btn-primary'" (click)="ref.close(true)" cdkFocusInitial>{{ data.confirmText || 'Confirm' }}</button>
    </div>`,
  styles: [`
    .t { font-size: 1.4rem; margin-bottom: 8px; } .m { color: var(--ink-soft); margin-bottom: 24px; max-width: 420px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
  `],
})
export class ConfirmDialogComponent {
  constructor(public ref: MatDialogRef<ConfirmDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: ConfirmOptions) {}
}

/** this.confirm.ask({ title: 'Delete product?', message: '…', danger: true }).subscribe(ok => …) */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  constructor(private dialog: MatDialog) {}
  ask(options: ConfirmOptions): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, { data: options, width: '92vw', maxWidth: '480px', autoFocus: false })
      .afterClosed()
      .pipe(map(r => r === true));
  }
}

/** <cf-status value="SHIPPED"> -> coloured pill. Works for order, payment, auction and bid-standing values. */
@Component({
  selector: 'cf-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="status" [ngClass]="'status-' + (value || '').toLowerCase()">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input() value = '';
  get label(): string { return (this.value || '').toLowerCase().replace(/_/g, ' '); }
}
