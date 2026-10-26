import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// Feather-style 24x24 stroke icons.
const ICONS: { [name: string]: string[] } = {
  'search': ['M3 11a8 8 0 1 0 16 0 8 8 0 1 0-16 0', 'M21 21l-4.35-4.35'],
  'heart': ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  'bag': ['M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  'bell': ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  'user': ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0'],
  'menu': ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  'x': ['M18 6L6 18', 'M6 6l12 12'],
  'clock': ['M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0', 'M12 6v6l4 2'],
  'zap': ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'check': ['M20 6L9 17l-5-5'],
  'mail': ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 6l-10 7L2 6'],
  'package': ['M16.5 9.4l-9-5.19', 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  'layout': ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  'alert': ['M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0', 'M12 8v4', 'M12 16h.01'],
  'instagram': ['M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5z', 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z', 'M17.5 6.5h.01'],
  'facebook': ['M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'],
  'map-pin': ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M15 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0'],
  'gavel': ['M14 13l-8.5 8.5a2.12 2.12 0 0 1-3-3L11 10', 'M16 16l6-6', 'M8 8l6-6', 'M9 7l8 8', 'M21 11l-8-8'],
  'trophy': ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2z'],
  'users': ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M13 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  'tag': ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  'edit': ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
  'trash': ['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  'plus': ['M12 5v14', 'M5 12h14'],
  'send': ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  'eye': ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0'],
  'upload': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  'bar-chart': ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
  'dollar': ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  'home': ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  'image': ['M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z', 'M10 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z', 'M21 15l-5-5L5 21'],
  'folder': ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  'inbox': ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
};

@Component({
  selector: 'cf-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" [attr.fill]="filled ? 'currentColor' : 'none'"
         stroke="currentColor" [attr.stroke-width]="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path *ngFor="let d of paths" [attr.d]="d"></path>
    </svg>`,
  styles: [':host { display: inline-flex; line-height: 0; flex-shrink: 0; }'],
})
export class IconComponent {
  @Input() name: string;
  @Input() size = 20;
  @Input() stroke = 1.8;
  @Input() filled = false;
  get paths(): string[] { return ICONS[this.name] || []; }
}
