import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Category } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../shared/components/feedback.components';

@Component({
  selector: 'cf-admin-categories',
  template: `
    <div class="page-head"><div><span class="eyebrow">Catalog</span><h1>Categories</h1></div></div>
    <div class="two-col">
      <div class="panel">
        <cf-spinner *ngIf="loading"></cf-spinner>
        <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load categories" [message]="error"><button class="btn btn-outline" (click)="load()">Try again</button></cf-empty-state>
        <cf-empty-state *ngIf="!loading && !error && !items.length" icon="folder" title="No categories yet" message="Create your first category."></cf-empty-state>
        <div class="table-wrap" *ngIf="!loading && items.length"><table class="table">
          <thead><tr><th>Category</th><th>Products</th><th></th></tr></thead>
          <tbody><tr *ngFor="let c of items">
            <td><div class="cell"><img class="thumb" [src]="c.image | imgUrl" alt=""><span><strong>{{ c.name }}</strong><small>{{ c.description }}</small></span></div></td>
            <td>{{ c.productCount }}</td>
            <td class="right"><div class="row-actions"><button class="btn btn-outline btn-sm" (click)="edit(c)"><cf-icon name="edit" [size]="15"></cf-icon> Edit</button><button class="btn btn-ghost btn-sm del" (click)="remove(c)" aria-label="Delete"><cf-icon name="trash" [size]="16"></cf-icon></button></div></td>
          </tr></tbody></table></div>
      </div>

      <form class="panel" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h3>{{ editing ? 'Edit category' : 'New category' }}</h3>
        <div class="alert alert-error" *ngIf="formError" role="alert">{{ formError }}</div>
        <div class="field"><label>Name</label><input class="input" formControlName="name"><span class="error" *ngIf="form.get('name').invalid && form.get('name').touched">Enter a name.</span></div>
        <div class="field"><label>Description</label><textarea class="input" rows="3" formControlName="description"></textarea></div>
        <div class="field"><label>Image <span class="muted" *ngIf="editing">(leave empty to keep the current one)</span></label>
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event)"></div>
        <div class="actions"><button class="btn btn-primary" type="submit" [disabled]="saving">{{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create category') }}</button>
          <button class="btn btn-ghost" type="button" *ngIf="editing" (click)="reset()">Cancel</button></div>
      </form>
    </div>`,
  styles: [`.del:hover { color: var(--danger); } .actions { display: flex; gap: 8px; } input[type=file] { font: inherit; font-size: .9rem; }`],
})
export class AdminCategoriesComponent implements OnInit {
  items: Category[] = [];
  form = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(100)]], description: [''] });
  editing: Category | null = null;
  file: File | null = null;
  loading = true; saving = false; error = ''; formError = '';

  constructor(private fb: FormBuilder, private api: CategoryService, private toast: ToastService, private confirm: ConfirmService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.list().subscribe(i => { this.items = i; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
  edit(c: Category): void { this.editing = c; this.file = null; this.formError = ''; this.form.reset({ name: c.name, description: c.description || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reset(): void { this.editing = null; this.file = null; this.formError = ''; this.form.reset({ name: '', description: '' }); }
  onFile(event: any): void {
    const f: File = event.target.files && event.target.files[0];
    if (f && f.size > 5 * 1024 * 1024) { this.toast.error('Image must be 5 MB or smaller.'); event.target.value = ''; this.file = null; return; }
    this.file = f || null;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const fd = new FormData();
    fd.append('name', this.form.value.name.trim()); fd.append('description', this.form.value.description || '');
    if (this.file) { fd.append('image', this.file); }
    this.saving = true; this.formError = '';
    const req = this.editing ? this.api.update(this.editing.id, fd) : this.api.create(fd);
    req.subscribe(() => { this.saving = false; this.toast.success(this.editing ? 'Category updated' : 'Category created'); this.reset(); this.load(); },
      e => { this.saving = false; this.formError = e.message; });
  }

  remove(c: Category): void {
    this.confirm.ask({ title: 'Delete "' + c.name + '"?', message: 'Categories that still contain products cannot be deleted.', confirmText: 'Delete', danger: true }).subscribe(ok => {
      if (!ok) { return; }
      this.api.remove(c.id).subscribe(() => { this.toast.success('Category deleted'); this.load(); }, e => this.toast.error(e.message));
    });
  }
}
