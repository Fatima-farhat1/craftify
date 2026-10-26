import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { MyBidsComponent, WonAuctionsComponent } from './bids.component';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { MessagesComponent } from './messages.component';
import { FavoritesComponent, NotificationsComponent } from './notifications.component';
import { MyOrdersComponent } from './orders.component';
import { OverviewComponent } from './overview.component';
import { ProfileComponent } from './profile.component';

@NgModule({
  declarations: [DashboardLayoutComponent, OverviewComponent, ProfileComponent, MyOrdersComponent, MyBidsComponent, WonAuctionsComponent,
    MessagesComponent, NotificationsComponent, FavoritesComponent],
  imports: [SharedModule, RouterModule.forChild([{
    path: '', component: DashboardLayoutComponent,
    children: [
      { path: '', component: OverviewComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'orders', component: MyOrdersComponent },
      { path: 'bids', component: MyBidsComponent },
      { path: 'won', component: WonAuctionsComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'favorites', component: FavoritesComponent },
    ],
  }])],
})
export class DashboardModule {}
