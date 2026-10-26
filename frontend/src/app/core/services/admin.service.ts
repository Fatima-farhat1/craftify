import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminOverview } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}
  overview(): Observable<AdminOverview> { return this.api.get<AdminOverview>('/admin/overview'); }
}
