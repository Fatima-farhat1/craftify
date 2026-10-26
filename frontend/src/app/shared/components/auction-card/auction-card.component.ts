import { Component, Input } from '@angular/core';
import { Auction, AuctionStatus } from '../../../core/models';

@Component({
  selector: 'cf-auction-card',
  templateUrl: './auction-card.component.html',
  styleUrls: ['./auction-card.component.scss'],
})
export class AuctionCardComponent {
  @Input() auction: Auction;
  /** When a countdown hits zero the card updates itself without waiting for a reload. */
  private override: AuctionStatus | null = null;

  get status(): AuctionStatus { return this.override || this.auction.status; }

  get priceLabel(): string {
    if (this.status === 'ENDED') { return this.auction.winningBid ? 'Winning bid' : 'No bids'; }
    if (this.status === 'UPCOMING') { return 'Starting price'; }
    return this.auction.bidCount > 0 ? 'Current bid' : 'Starting bid';
  }

  get price(): number {
    return this.status === 'ENDED' ? (this.auction.winningBid || this.auction.currentPrice) : this.auction.currentPrice;
  }

  onCountdownFinished(): void {
    if (this.auction.status === 'ACTIVE') { this.override = 'ENDED'; }
    if (this.auction.status === 'UPCOMING') { this.override = 'ACTIVE'; }
  }
}
