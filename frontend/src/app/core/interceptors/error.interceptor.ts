import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionService } from '../services/session.service';

/** The one error shape every component receives. `message` is always safe to show to the user. */
export class ApiError {
  constructor(public status: number, public message: string, public errors?: { field: string; message: string }[]) {}
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private session: SessionService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const error = this.normalize(err);
        const isCredentialCall = /\/auth\/(login|admin\/login|register)$/.test(req.url);

        // Token expired / invalid / user deactivated: drop the session and send them to log in again.
        if (err.status === 401 && !isCredentialCall && this.session.token) {
          const admin = this.router.url.startsWith('/admin');
          const returnUrl = this.router.url;
          this.session.clear();
          this.router.navigate([admin ? '/admin/login' : '/login'], { queryParams: { returnUrl } });
          error.message = 'Your session has expired. Please log in again.';
        }
        return throwError(error);
      })
    );
  }

  private normalize(err: HttpErrorResponse): ApiError {
    if (err.status === 0) { return new ApiError(0, 'Cannot reach the server. Please check your connection and try again.'); }
    const body = err.error;
    const message = body && typeof body.message === 'string' ? body.message : 'Something went wrong. Please try again.';
    return new ApiError(err.status, message, body && body.errors);
  }
}
