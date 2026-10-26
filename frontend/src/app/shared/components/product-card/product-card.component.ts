import { Component, Input } from '@angular/core';
import { Product } from '../../../core/models';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'cf-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
})
export class ProductCardComponent {
  @Input() product: Product;
  constructor(public favorites: FavoritesService) {}

  get outOfStock(): boolean { return this.product.stockQuantity === 0; }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.product.id).subscribe(() => {}, () => {});
  }
}
