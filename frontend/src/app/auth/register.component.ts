import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { safeReturnUrl } from '../core/utils';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password').value === group.get('confirmPassword').value ? null : { mismatch: true };
}

@Component({ selector: 'cf-register', templateUrl: './register.component.html', styleUrls: ['./auth.shared.scss'] })
export class RegisterComponent {
  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });
  loading = false;
  error = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute, private toast: ToastService) {}

  get returnUrl(): string | null { return this.route.snapshot.queryParamMap.get('returnUrl'); }

  invalid(name: string): boolean { const c = this.form.get(name); return c.invalid && c.touched; }
  get mismatch(): boolean { return this.form.hasError('mismatch') && this.form.get('confirmPassword').touched; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const v = this.form.value;
    this.auth.register({ ...v, email: v.email.trim() }).subscribe(
      user => {
        this.toast.success('Welcome to Craftify, ' + user.firstName + '!');
        this.router.navigateByUrl(safeReturnUrl(this.returnUrl, '/'));
      },
      e => { this.error = e.message; this.loading = false; }
    );
  }
}
