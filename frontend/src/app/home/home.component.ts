import { Component, OnInit } from '@angular/core';
import { Auction, Category, Product } from '../core/models';
import { AuctionService } from '../core/services/auction.service';
import { CategoryService } from '../core/services/category.service';
import { ProductService } from '../core/services/product.service';

interface Section<T> { loading: boolean; error: string; items: T[]; }
const section = <T>(): Section<T> => ({ loading: true, error: '', items: [] });

@Component({ selector: 'cf-home', templateUrl: './home.component.html', styleUrls: ['./home.component.scss'] })
export class HomeComponent implements OnInit {
  categories = section<Category>();
  featured = section<Product>();
  auctions = section<Auction>();
  skeletons = [1, 2, 3, 4];

  constructor(private categoryApi: CategoryService, private productApi: ProductService, private auctionApi: AuctionService) {}

  ngOnInit(): void { this.loadCategories(); this.loadFeatured(); this.loadAuctions(); }

  loadCategories(): void {
    this.categories = section();
    this.categoryApi.list().subscribe(
      items => (this.categories = { loading: false, error: '', items: items.filter(c => (c.productCount || 0) > 0).slice(0, 8) }),
      e => (this.categories = { loading: false, error: e.message, items: [] }));
  }

  loadFeatured(): void {
    this.featured = section();
    this.productApi.list({ featured: true, limit: 8 }).subscribe(
      page => (this.featured = { loading: false, error: '', items: page.items }),
      e => (this.featured = { loading: false, error: e.message, items: [] }));
  }

  loadAuctions(): void {
    this.auctions = section();
    this.auctionApi.list({ status: 'active', limit: 4 }).subscribe(
      page => (this.auctions = { loading: false, error: '', items: page.items }),
      e => (this.auctions = { loading: false, error: e.message, items: [] }));
  }
}
