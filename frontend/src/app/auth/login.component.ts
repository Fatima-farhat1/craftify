import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { safeReturnUrl } from '../core/utils';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';

@Component({ selector: 'cf-login', templateUrl: './login.component.html', styleUrls: ['./auth.shared.scss'] })
export class LoginComponent {
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  loading = false;
  error = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute, private toast: ToastService) {}

  get returnUrl(): string | null { return this.route.snapshot.queryParamMap.get('returnUrl'); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const v = this.form.value;
    this.auth.login(v.email.trim(), v.password).subscribe(
      user => {
        this.toast.success('Welcome back, ' + user.firstName + '!');
        this.router.navigateByUrl(user.role === 'ADMIN' ? '/admin' : safeReturnUrl(this.returnUrl, '/'));
      },
      e => { this.error = e.message; this.loading = false; }
    );
  }
}
