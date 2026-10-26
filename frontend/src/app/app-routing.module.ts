import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';
import { NotFoundComponent } from './not-found.component';

// Every feature area is lazy-loaded. Login/Register/Admin login live in the (eager) AuthModule.
const routes: Routes = [
  { path: '', pathMatch: 'full', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
  { path: 'products', loadChildren: () => import('./products/products.module').then(m => m.ProductsModule) },
  { path: 'categories', loadChildren: () => import('./categories/categories.module').then(m => m.CategoriesModule) },
  { path: 'auctions', loadChildren: () => import('./auctions/auctions.module').then(m => m.AuctionsModule) },
  { path: 'cart', canActivate: [AuthGuard], data: { roles: ['USER'] }, loadChildren: () => import('./cart/cart.module').then(m => m.CartModule) },
  { path: 'checkout', canActivate: [AuthGuard], data: { roles: ['USER'] }, loadChildren: () => import('./checkout/checkout.module').then(m => m.CheckoutModule) },
  { path: 'dashboard', canActivate: [AuthGuard], data: { roles: ['USER'] }, loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'admin', canActivate: [AdminGuard], loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
