import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GuestGuard } from '../core/guards/guest.guard';
import { SharedModule } from '../shared/shared.module';
import { AdminLoginComponent } from './admin-login.component';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';

// Eager (small, needed early). Must be imported in AppModule BEFORE AppRoutingModule so the '**' route stays last.
@NgModule({
  declarations: [LoginComponent, RegisterComponent, AdminLoginComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
      { path: 'admin/login', component: AdminLoginComponent, canActivate: [GuestGuard] },
    ]),
  ],
})
export class AuthModule {}
