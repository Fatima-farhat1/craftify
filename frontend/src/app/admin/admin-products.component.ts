import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Category, Page, Product } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { ProductService } from '../core/services/product.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../shared/components/feedback.components';

@Component({
  selector: 'cf-admin-products',
  template: `
    <div class="page-head"><div><span class="eyebrow">Catalog</span><h1>Products</h1></div>
      <a class="btn btn-primary" routerLink="/admin/products/new"><cf-icon name="plus" [size]="16"></cf-icon> Add product</a></div>

    <form class="toolbar" [formGroup]="filters">
      <input class="input grow" type="search" formControlName="search" placeholder="Search products…" aria-label="Search">
      <select class="select" formControlName="category" aria-label="Category"><option [ngValue]="null">All categories</option><option *ngFor="let c of categories" [ngValue]="c.id">{{ c.name }}</option></select>
      <select class="select" formControlName="sort" aria-label="Sort"><option value="newest">Newest</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option><option value="name">Name</option></select>
    </form>

    <div class="panel">
      <cf-spinner *ngIf="loading"></cf-spinner>
      <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load products" [message]="error"><button class="btn btn-outline" (click)="load(1)">Try again</button></cf-empty-state>
      <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="tag" title="No products found" message="Add your first handmade product." actionLabel="Add product" actionLink="/admin/products/new"></cf-empty-state>
      <div class="table-wrap" *ngIf="!loading && data && data.items.length">
        <table class="table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody><tr *ngFor="let p of data.items">
            <td><div class="cell"><img class="thumb" [src]="p.image | imgUrl" alt=""><span><strong>{{ p.name }}</strong><small>Added {{ p.createdAt | date:'mediumDate' }}</small></span></div></td>
            <td>{{ p.categoryName }}</td><td>{{ p.price | money }}</td>
            <td><span [class.low]="p.stockQuantity <= 3">{{ p.stockQuantity }}</span></td>
            <td><button class="pill" [class.on]="p.isAvailable" (click)="toggle(p, 'isAvailable')" title="Click to toggle">{{ p.isAvailable ? 'Available' : 'Disabled' }}</button>
                <button class="pill" [class.on]="p.isFeatured" (click)="toggle(p, 'isFeatured')" title="Click to toggle">{{ p.isFeatured ? 'Featured' : 'Not featured' }}</button>
                <cf-status *ngIf="p.hasAuction" value="active"></cf-status></td>
            <td class="right"><div class="row-actions">
              <a class="btn btn-ghost btn-sm" [routerLink]="['/products', p.id]" target="_blank" aria-label="View"><cf-icon name="eye" [size]="16"></cf-icon></a>
              <a class="btn btn-outline btn-sm" [routerLink]="['/admin/products', p.id]"><cf-icon name="edit" [size]="15"></cf-icon> Edit</a>
              <a class="btn btn-ghost btn-sm" [routerLink]="['/admin/auctions/new']" [queryParams]="{ product: p.id }" title="Create auction"><cf-icon name="gavel" [size]="16"></cf-icon></a>
              <button class="btn btn-ghost btn-sm del" (click)="remove(p)" aria-label="Delete"><cf-icon name="trash" [size]="16"></cf-icon></button>
            </div></td>
          </tr></tbody>
        </table>
      </div>
    </div>
    <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="load($event)"></cf-pagination>`,
  styles: [`
    .pill { margin-right: 6px; padding: 4px 11px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--white); font: 600 .72rem var(--font-body); color: var(--muted); } .pill.on { background: #E3F4EA; border-color: #E3F4EA; color: #1F6B3F; } .pill:hover { border-color: var(--brand-400); }
    .low { color: var(--danger); font-weight: 700; } .del:hover { color: var(--danger); }
  `],
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  filters = this.fb.group({ search: [''], category: [null], sort: ['newest'] });
  categories: Category[] = [];
  data: Page<Product> | null = null;
  loading = true; error = '';
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private api: ProductService, private categoryApi: CategoryService, private toast: ToastService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.categoryApi.list().subscribe(c => (this.categories = c), () => {});
    this.filters.valueChanges.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.load(1));
    this.load(1);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(page: number): void {
    this.loading = true; this.error = '';
    const f = this.filters.value;
    this.api.listAdmin({ search: f.search || undefined, category: f.category || undefined, sort: f.sort, page, limit: 12 })
      .subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }

  toggle(p: Product, field: 'isAvailable' | 'isFeatured'): void {
    const form = new FormData();
    form.append(field, String(!p[field]));
    this.api.update(p.id, form).subscribe(u => { p[field] = u[field]; this.toast.success('Updated'); }, e => this.toast.error(e.message));
  }

  remove(p: Product): void {
    this.confirm.ask({ title: 'Delete "' + p.name + '"?', message: 'This also deletes its images. If it has orders or auctions it cannot be deleted — disable it instead.', confirmText: 'Delete', danger: true }).subscribe(ok => {
      if (!ok) { return; }
      this.api.remove(p.id).subscribe(() => { this.toast.success('Product deleted'); this.load(this.data && this.data.items.length === 1 && this.data.page > 1 ? this.data.page - 1 : (this.data ? this.data.page : 1)); }, e => this.toast.error(e.message));
    });
  }
}

@Component({
  selector: 'cf-admin-product-form',
  template: `
    <a routerLink="/admin/products" class="back">← Back to products</a>
    <div class="page-head"><div><span class="eyebrow">Catalog</span><h1>{{ id ? 'Edit product' : 'New product' }}</h1></div></div>
    <cf-spinner *ngIf="loading" label="Loading…"></cf-spinner>
    <cf-empty-state *ngIf="!loading && loadError" icon="alert" title="Couldn't load this product" [message]="loadError" actionLabel="Back to products" actionLink="/admin/products"></cf-empty-state>

    <form *ngIf="!loading && !loadError" [formGroup]="form" (ngSubmit)="save()" novalidate class="two-col">
      <div>
        <div class="panel">
          <h3>Details</h3>
          <div class="alert alert-error" *ngIf="error" role="alert">{{ error }}</div>
          <div class="field"><label>Name</label><input class="input" formControlName="name"><span class="error" *ngIf="bad('name')">Enter a product name.</span></div>
          <div class="form-grid">
            <div class="field"><label>Category</label><select class="select" formControlName="categoryId"><option [ngValue]="null" disabled>Select a category</option><option *ngFor="let c of categories" [ngValue]="c.id">{{ c.name }}</option></select><span class="error" *ngIf="bad('categoryId')">Choose a category.</span></div>
            <div class="field"><label>Price ($)</label><input class="input" type="number" min="0" step="0.01" formControlName="price"><span class="error" *ngIf="bad('price')">Enter a valid price.</span></div>
            <div class="field"><label>Stock quantity</label><input class="input" type="number" min="0" step="1" formControlName="stockQuantity"><span class="error" *ngIf="bad('stockQuantity')">Enter a whole number.</span></div>
          </div>
          <div class="field"><label>Description</label><textarea class="input" rows="6" formControlName="description" placeholder="Materials, dimensions, story behind the piece…"></textarea></div>
        </div>

        <div class="panel">
          <h3>Images</h3>
          <div class="imgs" *ngIf="existing.length">
            <div class="im" *ngFor="let i of existing" [class.primary]="i.isPrimary">
              <img [src]="i.url | imgUrl" alt=""><span class="pm" *ngIf="i.isPrimary">Main</span>
              <div class="ia"><button type="button" *ngIf="!i.isPrimary" (click)="makePrimary(i.id)">Make main</button><button type="button" (click)="removeExisting(i.id)">Remove</button></div>
            </div>
          </div>
          <div class="imgs" *ngIf="previews.length">
            <div class="im new" *ngFor="let p of previews; let n = index"><img [src]="p" alt=""><span class="pm">New</span><div class="ia"><button type="button" (click)="removeNew(n)">Remove</button></div></div>
          </div>
          <label class="drop"><cf-icon name="upload" [size]="22"></cf-icon><span>Click to upload images <small>(JPG, PNG, WEBP · up to 5 MB each · max 6 per save)</small></span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden (change)="onFiles($event)"></label>
        </div>
      </div>

      <aside>
        <div class="panel">
          <h3>Visibility</h3>
          <label class="checkbox"><input type="checkbox" formControlName="isAvailable"> Available in the shop</label>
          <label class="checkbox"><input type="checkbox" formControlName="isFeatured"> Featured on the home page</label>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="saving">{{ saving ? 'Saving…' : (id ? 'Save changes' : 'Create product') }}</button>
        </div>
      </aside>
    </form>`,
  styles: [`
    .imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .im { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 2px solid var(--line); background: var(--beige); } .im.primary { border-color: var(--brand-500); } .im img { width: 100%; height: 100%; object-fit: cover; }
    .pm { position: absolute; left: 6px; top: 6px; padding: 2px 8px; border-radius: 999px; background: var(--brand-600); color: #fff; font-size: .65rem; font-weight: 700; text-transform: uppercase; } .im.new .pm { background: var(--ink); }
    .ia { position: absolute; inset: auto 0 0 0; display: flex; gap: 4px; padding: 6px; background: linear-gradient(transparent, rgba(0,0,0,.65)); opacity: 0; transition: opacity .2s; } .im:hover .ia { opacity: 1; } .ia button { flex: 1; padding: 4px; border: 0; border-radius: 6px; background: #fff; font-size: .7rem; font-weight: 600; }
    .drop { display: flex; align-items: center; gap: 14px; padding: 22px; border: 2px dashed var(--sand); border-radius: 14px; color: var(--ink-soft); cursor: pointer; } .drop:hover { border-color: var(--brand-400); background: var(--brand-50); } .drop small { display: block; color: var(--muted); }
    .textarea { resize: vertical; }
  `],
})
export class AdminProductFormComponent implements OnInit {
  id = 0;
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]], categoryId: [null, Validators.required],
    price: [null, [Validators.required, Validators.min(0)]], stockQuantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    description: [''], isAvailable: [true], isFeatured: [false],
  });
  categories: Category[] = [];
  existing: { id: number; url: string; isPrimary: boolean }[] = [];
  files: File[] = [];
  previews: string[] = [];
  loading = true; saving = false; error = ''; loadError = '';

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private api: ProductService,
              private categoryApi: CategoryService, private toast: ToastService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.categoryApi.list().subscribe(c => (this.categories = c), () => {});
    if (!this.id) { this.loading = false; return; }
    this.api.get(this.id).subscribe(p => {
      this.form.patchValue({ name: p.name, categoryId: p.categoryId, price: p.price, stockQuantity: p.stockQuantity, description: p.description || '', isAvailable: p.isAvailable, isFeatured: p.isFeatured });
      this.existing = p.images || [];
      this.loading = false;
    }, e => { this.loadError = e.message; this.loading = false; });
  }

  bad(n: string): boolean { const c = this.form.get(n); return c.invalid && c.touched; }

  onFiles(event: any): void {
    const picked: File[] = Array.prototype.slice.call(event.target.files || []);
    event.target.value = '';
    for (const f of picked) {
      if (f.size > 5 * 1024 * 1024) { this.toast.error(f.name + ' is larger than 5 MB.'); continue; }
      if (this.files.length >= 6) { this.toast.error('You can upload up to 6 images at a time.'); break; }
      this.files.push(f); this.previews.push(URL.createObjectURL(f));
    }
  }
  removeNew(i: number): void { URL.revokeObjectURL(this.previews[i]); this.files.splice(i, 1); this.previews.splice(i, 1); }
  removeExisting(imageId: number): void {
    this.api.removeImage(this.id, imageId).subscribe(p => { this.existing = p.images || []; this.toast.info('Image removed'); }, e => this.toast.error(e.message));
  }
  makePrimary(imageId: number): void {
    this.api.setPrimaryImage(this.id, imageId).subscribe(p => { this.existing = p.images || []; this.toast.success('Main image updated'); }, e => this.toast.error(e.message));
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const fd = new FormData();
    fd.append('name', v.name.trim()); fd.append('categoryId', String(v.categoryId)); fd.append('price', String(v.price));
    fd.append('stockQuantity', String(v.stockQuantity)); fd.append('description', v.description || '');
    fd.append('isAvailable', String(!!v.isAvailable)); fd.append('isFeatured', String(!!v.isFeatured));
    this.files.forEach(f => fd.append('images', f));

    this.saving = true; this.error = '';
    const req = this.id ? this.api.update(this.id, fd) : this.api.create(fd);
    req.subscribe(() => { this.toast.success(this.id ? 'Product updated' : 'Product created'); this.router.navigate(['/admin/products']); },
      e => { this.saving = false; this.error = e.message; window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
}

