import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuctionCardComponent } from './components/auction-card/auction-card.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { ConfirmDialogComponent, EmptyStateComponent, SkeletonCardComponent, SpinnerComponent, StatusBadgeComponent } from './components/feedback.components';
import { IconComponent } from './components/icon.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { GalleryComponent, PaginationComponent, QuantityComponent } from './components/widgets.components';
import { ImgUrlPipe } from './pipes/img-url.pipe';
import { MoneyPipe } from './pipes/money.pipe';

const DECLARATIONS = [
  IconComponent, CountdownComponent, ProductCardComponent, AuctionCardComponent,
  SpinnerComponent, SkeletonCardComponent, EmptyStateComponent, ConfirmDialogComponent, StatusBadgeComponent,
  PaginationComponent, QuantityComponent, GalleryComponent,
  ImgUrlPipe, MoneyPipe,
];
const MATERIAL = [MatMenuModule, MatDialogModule, MatSnackBarModule, MatTooltipModule];
const FORMS = [FormsModule, ReactiveFormsModule];

@NgModule({
  imports: [CommonModule, RouterModule, ...FORMS, ...MATERIAL],
  declarations: DECLARATIONS,
  exports: [CommonModule, RouterModule, ...FORMS, ...MATERIAL, ...DECLARATIONS],
})
export class SharedModule {}
