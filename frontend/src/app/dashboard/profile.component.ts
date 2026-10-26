import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { User } from '../core/models';
import { SessionService } from '../core/services/session.service';
import { ToastService } from '../core/services/toast.service';
import { UserService } from '../core/services/user.service';

function match(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword').value === group.get('confirmNewPassword').value ? null : { mismatch: true };
}

@Component({
  selector: 'cf-profile',
  template: `
    <div class="page-head"><div><span class="eyebrow">Account</span><h1>My profile</h1></div></div>

    <div class="panel">
      <h3>Profile picture</h3>
      <div class="avatar-row">
        <span class="avatar"><img *ngIf="user?.profileImage; else ini" [src]="user.profileImage | imgUrl" alt="Profile picture"><ng-template #ini>{{ user?.firstName[0] }}{{ user?.lastName[0] }}</ng-template></span>
        <div class="acts">
          <label class="btn btn-outline btn-sm"><cf-icon name="upload" [size]="16"></cf-icon> {{ uploading ? 'Uploading…' : 'Upload photo' }}
            <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event)" hidden [disabled]="uploading"></label>
          <button type="button" class="btn btn-ghost btn-sm" *ngIf="user?.profileImage" (click)="removePhoto()">Remove</button>
          <small class="muted">JPG, PNG or WEBP, up to 5 MB.</small>
        </div>
      </div>
    </div>

    <form class="panel" [formGroup]="form" (ngSubmit)="saveProfile()" novalidate>
      <h3>Personal details</h3>
      <div class="alert alert-error" *ngIf="profileError" role="alert">{{ profileError }}</div>
      <div class="form-grid">
        <div class="field"><label>First name</label><input class="input" formControlName="firstName"><span class="error" *ngIf="bad('firstName')">Required.</span></div>
        <div class="field"><label>Last name</label><input class="input" formControlName="lastName"><span class="error" *ngIf="bad('lastName')">Required.</span></div>
        <div class="field"><label>Email</label><input class="input" type="email" formControlName="email"><span class="error" *ngIf="bad('email')">Enter a valid email.</span></div>
        <div class="field"><label>Phone</label><input class="input" formControlName="phone" placeholder="+961 …"><span class="error" *ngIf="bad('phone')">Enter a valid phone number.</span></div>
        <div class="field full"><label>Address</label><textarea class="input textarea" rows="3" formControlName="address" placeholder="Street, city, country"></textarea></div>
        <div class="field full" *ngIf="emailChanged"><label>Current password (required to change your email)</label><input class="input" type="password" formControlName="currentPassword" autocomplete="current-password"></div>
      </div>
      <button class="btn btn-primary" type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save changes' }}</button>
    </form>

    <form class="panel" [formGroup]="pwForm" (ngSubmit)="savePassword()" novalidate>
      <h3>Change password</h3>
      <div class="alert alert-error" *ngIf="pwError" role="alert">{{ pwError }}</div>
      <div class="form-grid">
        <div class="field full"><label>Current password</label><input class="input" type="password" formControlName="currentPassword" autocomplete="current-password"></div>
        <div class="field"><label>New password</label><input class="input" type="password" formControlName="newPassword" autocomplete="new-password"><span class="error" *ngIf="pwBad('newPassword')">At least 8 characters.</span></div>
        <div class="field"><label>Confirm new password</label><input class="input" type="password" formControlName="confirmNewPassword" autocomplete="new-password"><span class="error" *ngIf="pwForm.hasError('mismatch') && pwForm.get('confirmNewPassword').touched">Passwords do not match.</span></div>
      </div>
      <button class="btn btn-outline" type="submit" [disabled]="pwSaving">{{ pwSaving ? 'Updating…' : 'Update password' }}</button>
    </form>`,
  styles: [`
    .avatar-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; } .acts { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .avatar { width: 84px; height: 84px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: var(--brand-100); color: var(--brand-800); font: 700 1.6rem var(--font-display); text-transform: uppercase; } .avatar img { width: 100%; height: 100%; object-fit: cover; }
    label.btn { cursor: pointer; } .textarea { resize: vertical; }
  `],
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]], lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]], phone: ['', Validators.pattern(/^(\+?[\d\s().-]{6,30})?$/)],
    address: [''], currentPassword: [''],
  });
  pwForm = this.fb.group({
    currentPassword: ['', Validators.required], newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]], confirmNewPassword: ['', Validators.required],
  }, { validators: match });
  saving = false; pwSaving = false; uploading = false; profileError = ''; pwError = '';

  constructor(private fb: FormBuilder, private api: UserService, private session: SessionService, private toast: ToastService) {}

  ngOnInit(): void {
    this.user = this.session.user;
    this.session.user$.subscribe(u => (this.user = u));
    if (this.user) { this.form.patchValue({ ...this.user, phone: this.user.phone || '', address: this.user.address || '' }); }
  }

  get emailChanged(): boolean { return !!this.user && this.form.value.email.trim().toLowerCase() !== this.user.email; }
  bad(n: string): boolean { const c = this.form.get(n); return c.invalid && c.touched; }
  pwBad(n: string): boolean { const c = this.pwForm.get(n); return c.invalid && c.touched; }

  saveProfile(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.profileError = '';
    const v = this.form.value;
    this.api.updateProfile({ firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim(), phone: v.phone, address: v.address, currentPassword: v.currentPassword || undefined }).subscribe(
      () => { this.saving = false; this.form.patchValue({ currentPassword: '' }); this.toast.success('Profile updated'); },
      e => { this.saving = false; this.profileError = e.message; });
  }

  savePassword(): void {
    if (this.pwForm.invalid) { this.pwForm.markAllAsTouched(); return; }
    this.pwSaving = true; this.pwError = '';
    this.api.changePassword(this.pwForm.value).subscribe(
      () => { this.pwSaving = false; this.pwForm.reset(); this.toast.success('Password updated'); },
      e => { this.pwSaving = false; this.pwError = e.message; });
  }

  onFile(event: any): void {
    const file: File = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) { return; }
    if (file.size > 5 * 1024 * 1024) { this.toast.error('Image must be 5 MB or smaller.'); return; }
    this.uploading = true;
    this.api.uploadAvatar(file).subscribe(() => { this.uploading = false; this.toast.success('Photo updated'); }, e => { this.uploading = false; this.toast.error(e.message); });
  }
  removePhoto(): void { this.api.removeAvatar().subscribe(() => this.toast.info('Photo removed'), e => this.toast.error(e.message)); }
}
