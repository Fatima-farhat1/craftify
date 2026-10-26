import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { safeReturnUrl } from '../core/utils';

@Component({ selector: 'cf-admin-login', templateUrl: './admin-login.component.html', styleUrls: ['./auth.shared.scss'] })
export class AdminLoginComponent {
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const v = this.form.value;
    this.auth.adminLogin(v.email.trim(), v.password).subscribe(
      () => this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '/admin')),
      e => { this.error = e.message; this.loading = false; }
    );
  }
}
