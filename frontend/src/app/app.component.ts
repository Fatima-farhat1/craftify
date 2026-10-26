import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { LoadingService } from './core/services/loading.service';
import { AuthService } from './core/services/auth.service';
import { SessionService } from './core/services/session.service';

@Component({ selector: 'cf-root', templateUrl: './app.component.html', styleUrls: ['./app.component.scss'] })
export class AppComponent implements OnInit {
  loading$ = this.loading.active$;
  /** The admin area has its own layout (added with the admin dashboard), so the public header/footer are hidden there. */
  isAdminArea$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url.startsWith('/admin'))
  );

  constructor(private loading: LoadingService, private router: Router, private auth: AuthService, private session: SessionService) {}

  ngOnInit(): void {
    // If a token is stored, confirm with the server that it is still valid (a 401 logs the user out automatically).
    if (this.session.isLoggedIn) { this.auth.refreshMe().subscribe(() => {}, () => {}); }
  }
}
