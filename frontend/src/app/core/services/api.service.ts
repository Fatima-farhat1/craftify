import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

/** Thin wrapper over HttpClient: prefixes the base URL, unwraps { success, data }, drops empty query params. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: { [key: string]: any }, opts: { background?: boolean } = {}): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(environment.apiUrl + path, { params: this.toParams(params), headers: this.headers(opts) })
      .pipe(map(r => r.data));
  }

  post<T>(path: string, body: any = {}): Observable<T> {
    return this.http.post<ApiResponse<T>>(environment.apiUrl + path, body).pipe(map(r => r.data));
  }

  put<T>(path: string, body: any = {}): Observable<T> {
    return this.http.put<ApiResponse<T>>(environment.apiUrl + path, body).pipe(map(r => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(environment.apiUrl + path).pipe(map(r => r.data));
  }

  private toParams(params?: { [key: string]: any }): HttpParams {
    let p = new HttpParams();
    Object.keys(params || {}).forEach(k => {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') { p = p.set(k, String(v)); }
    });
    return p;
  }

  /** "background" requests (polling) don't trigger the global loading bar. */
  private headers(opts: { background?: boolean }): HttpHeaders {
    return opts.background ? new HttpHeaders({ 'X-Background': '1' }) : new HttpHeaders();
  }
}
