import { Component, OnInit } from '@angular/core';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Category } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'cf-categories',
  template: `
    <section class="container wrap">
      <div class="page-head"><div><span class="eyebrow">Browse</span><h1>Categories</h1><p>Explore handmade pieces by craft and tradition.</p></div></div>

      <div class="grid" *ngIf="loading"><div class="skeleton sk" *ngFor="let s of [1,2,3,4,5,6]"></div></div>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load categories" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>
      <cf-empty-state *ngIf="!loading && !error && !items.length" icon="folder" title="No categories yet" message="Check back soon."></cf-empty-state>

      <div class="grid" *ngIf="!loading && items.length">
        <a class="cat" *ngFor="let c of items" routerLink="/products" [queryParams]="{ category: c.id }">
          <div class="img"><img [src]="c.image | imgUrl" [alt]="c.name" loading="lazy"></div>
          <div class="body">
            <h3>{{ c.name }}</h3>
            <p *ngIf="c.description">{{ c.description }}</p>
            <span class="count">{{ c.productCount }} {{ c.productCount === 1 ? 'piece' : 'pieces' }} <cf-icon name="arrow-right" [size]="14"></cf-icon></span>
          </div>
        </a>
      </div>
    </section>`,
  styles: [`
    .wrap { padding-top: 40px; padding-bottom: 56px; }
    .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .sk { height: 320px; border-radius: var(--radius-lg); }
    .cat { display: flex; flex-direction: column; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; transition: transform .25s, box-shadow .25s; }
    .cat:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
    .img { aspect-ratio: 16 / 10; overflow: hidden; background: var(--beige); } .img img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; } .cat:hover img { transform: scale(1.05); }
    .body { padding: 18px 20px 22px; } h3 { margin-bottom: 6px; } p { color: var(--muted); font-size: .92rem; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .count { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--brand-700); font-size: .9rem; }
  `],
})
export class CategoriesComponent implements OnInit {
  items: Category[] = [];
  loading = true;
  error = '';
  constructor(private api: CategoryService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.api.list().subscribe(c => { this.items = c; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
}

@NgModule({
  declarations: [CategoriesComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: CategoriesComponent }])],
})
export class CategoriesModule {}
