import { Pipe, PipeTransform } from '@angular/core';

/** 75 -> "$75", 75.5 -> "$75.50", 1250 -> "$1,250" */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(Number(value))) { return ''; }
    const n = Number(value);
    const whole = Math.round(n * 100) % 100 === 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  }
}
