import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AuctionDetailComponent } from './auction-detail.component';
import { AuctionListComponent } from './auction-list.component';

@NgModule({
  declarations: [AuctionListComponent, AuctionDetailComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: '', component: AuctionListComponent },
    { path: ':id', component: AuctionDetailComponent },
  ])],
})
export class AuctionsModule {}
