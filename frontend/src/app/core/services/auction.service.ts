import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auction, AuctionQuery, Bid, Page } from '../models';
import { ApiService } from './api.service';

export interface AuctionPayload { productId: number; startingPrice: number; startTime: string; endTime: string; }

@Injectable({ providedIn: 'root' })
export class AuctionService {
  constructor(private api: ApiService) {}

  list(query: AuctionQuery = {}): Observable<Page<Auction>> { return this.api.get<Page<Auction>>('/auctions', query); }

  /** background = true for polling: doesn't flash the global loading bar. */
  get(id: number, background = false): Observable<Auction> { return this.api.get<Auction>('/auctions/' + id, {}, { background }); }
  bids(id: number, background = false): Observable<Bid[]> { return this.api.get<Bid[]>('/auctions/' + id + '/bids', {}, { background }); }
  placeBid(id: number, amount: number): Observable<{ bidId: number; auction: Auction }> {
    return this.api.post<{ bidId: number; auction: Auction }>('/auctions/' + id + '/bids', { amount });
  }

  // ---- admin ----
  create(body: AuctionPayload): Observable<Auction> { return this.api.post<Auction>('/auctions', body); }
  update(id: number, body: Partial<AuctionPayload>): Observable<Auction> { return this.api.put<Auction>('/auctions/' + id, body); }
  remove(id: number): Observable<{ deleted: boolean }> { return this.api.delete<{ deleted: boolean }>('/auctions/' + id); }
  cancel(id: number): Observable<Auction> { return this.api.post<Auction>('/auctions/' + id + '/cancel'); }
  endNow(id: number): Observable<Auction> { return this.api.post<Auction>('/auctions/' + id + '/end'); }
}
