import { Component } from '@angular/core';

@Component({
  selector: 'cf-not-found',
  template: `
    <section class="container nf">
      <span class="eyebrow">Error 404</span>
      <h1>This page wandered off.</h1>
      <p>The page you're looking for doesn't exist (or hasn't been built yet). Let's get you back to something handmade.</p>
      <a routerLink="/" class="btn btn-primary btn-lg">Back to home</a>
    </section>`,
  styles: [`.nf { text-align: center; padding: 120px 16px; max-width: 640px; } p { color: var(--muted); margin-bottom: 28px; }`],
})
export class NotFoundComponent {}
