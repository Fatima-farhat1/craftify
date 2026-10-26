import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Category, Page, Product, ProductQuery } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { ProductService } from '../core/services/product.service';

@Component({ selector: 'cf-product-list', templateUrl: './product-list.component.html', styleUrls: ['./product-list.component.scss'] })
export class ProductListComponent implements OnInit, OnDestroy {
  form = this.fb.group({ search: [''], category: [null], minPrice: [''], maxPrice: [''], featured: [false], sort: ['newest'] });
  categories: Category[] = [];
  result: Page<Product> | null = null;
  loading = true;
  error = '';
  page = 1;
  priceError = '';
  filtersOpen = false;
  skeletons = [1, 2, 3, 4, 5, 6];
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router,
              private productApi: ProductService, private categoryApi: CategoryService) {}

  ngOnInit(): void {
    this.categoryApi.list().subscribe(c => (this.categories = c), () => {});

    // URL is the single source of truth: it fills the form AND drives the request (shareable / back-button friendly).
    this.route.queryParamMap.pipe(
      tap(p => this.syncForm(p)),
      switchMap(p => this.productApi.list(this.toQuery(p)).pipe(
        catchError(e => { this.error = e.message; return of(null as Page<Product> | null); })
      )),
      takeUntil(this.destroy$)
    ).subscribe(res => { this.result = res; this.loading = false; });

    this.form.valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setCategory(id: number | null): void { this.form.patchValue({ category: id }); }

  applyFilters(): void {
    const v = this.form.value;
    const min = v.minPrice === '' || v.minPrice === null ? null : Number(v.minPrice);
    const max = v.maxPrice === '' || v.maxPrice === null ? null : Number(v.maxPrice);
    this.priceError = min !== null && max !== null && min > max ? 'Minimum price is higher than maximum.' : '';
    if (this.priceError) { return; }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: (v.search || '').trim() || null, category: v.category || null, minPrice: min, maxPrice: max,
        featured: v.featured ? 'true' : null, sort: v.sort === 'newest' ? null : v.sort, page: null,
      },
    });
  }

  clearFilters(): void { this.router.navigate([], { relativeTo: this.route, queryParams: {} }); }

  goToPage(page: number): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private syncForm(p: ParamMap): void {
    this.loading = true;
    this.error = '';
    this.page = Number(p.get('page')) || 1;
    this.form.patchValue({
      search: p.get('search') || '', category: p.get('category') ? Number(p.get('category')) : null,
      minPrice: p.get('minPrice') || '', maxPrice: p.get('maxPrice') || '',
      featured: p.get('featured') === 'true', sort: p.get('sort') || 'newest',
    }, { emitEvent: false });
  }

  private toQuery(p: ParamMap): ProductQuery {
    const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
    return {
      search: p.get('search') || undefined, category: num('category'), minPrice: num('minPrice'), maxPrice: num('maxPrice'),
      featured: p.get('featured') === 'true' ? true : undefined, sort: (p.get('sort') as ProductQuery['sort']) || 'newest',
      page: this.page, limit: 12,
    };
  }
}
