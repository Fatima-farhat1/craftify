import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';

/** Adds "Authorization: Bearer <jwt>" to calls to OUR API only (never leaks the token to other hosts). */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private session: SessionService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.session.token;
    if (token && req.url.startsWith(environment.apiUrl)) {
      return next.handle(req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }));
    }
    return next.handle(req);
  }
}
