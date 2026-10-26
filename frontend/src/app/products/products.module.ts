import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ProductDetailComponent } from './product-detail.component';
import { ProductListComponent } from './product-list.component';

@NgModule({
  declarations: [ProductListComponent, ProductDetailComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: '', component: ProductListComponent },
    { path: ':id', component: ProductDetailComponent },
  ])],
})
export class ProductsModule {}
