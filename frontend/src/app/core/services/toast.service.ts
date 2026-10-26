import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private snack: MatSnackBar) {}
  success(message: string): void { this.open(message, 'success'); }
  error(message: string): void { this.open(message, 'error', 6000); }
  info(message: string): void { this.open(message, 'info'); }

  private open(message: string, kind: 'success' | 'error' | 'info', duration = 3500): void {
    this.snack.open(message, 'Close', {
      duration, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['cf-toast', 'cf-toast-' + kind],
    });
  }
}
