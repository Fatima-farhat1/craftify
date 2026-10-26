import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AdminAuctionDetailComponent, AdminAuctionFormComponent, AdminAuctionsComponent } from './admin-auctions.component';
import { AdminCategoriesComponent } from './admin-categories.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminMessagesComponent } from './admin-messages.component';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminProductFormComponent, AdminProductsComponent } from './admin-products.component';
import { AdminUserDetailComponent, AdminUsersComponent } from './admin-users.component';

@NgModule({
  declarations: [
    AdminLayoutComponent, AdminDashboardComponent, AdminProductsComponent, AdminProductFormComponent, AdminCategoriesComponent,
    AdminOrdersComponent, AdminAuctionsComponent, AdminAuctionFormComponent, AdminAuctionDetailComponent,
    AdminUsersComponent, AdminUserDetailComponent, AdminMessagesComponent,
  ],
  imports: [SharedModule, RouterModule.forChild([{
    path: '', component: AdminLayoutComponent,
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'products/new', component: AdminProductFormComponent },
      { path: 'products/:id', component: AdminProductFormComponent },
      { path: 'categories', component: AdminCategoriesComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'auctions', component: AdminAuctionsComponent },
      { path: 'auctions/new', component: AdminAuctionFormComponent },
      { path: 'auctions/:id/edit', component: AdminAuctionFormComponent },
      { path: 'auctions/:id', component: AdminAuctionDetailComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'users/:id', component: AdminUserDetailComponent },
      { path: 'messages', component: AdminMessagesComponent },
    ],
  }])],
})
export class AdminModule {}
