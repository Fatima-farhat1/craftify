import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Message, MessagePage } from '../core/models';
import { MessageService } from '../core/services/message.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'cf-messages',
  template: `
    <div class="page-head">
      <div><span class="eyebrow">Inbox</span><h1>Messages</h1></div>
      <button class="btn btn-primary" (click)="compose()"><cf-icon name="edit" [size]="16"></cf-icon> Contact Craftify</button>
    </div>

    <div class="mail" [class.reading]="selected || composing">
      <div class="list panel">
        <div class="tabs">
          <button class="tab" [class.on]="box === 'inbox'" (click)="setBox('inbox')">Inbox <span *ngIf="data && data.unreadCount">({{ data.unreadCount }})</span></button>
          <button class="tab" [class.on]="box === 'sent'" (click)="setBox('sent')">Sent</button>
        </div>
        <cf-spinner *ngIf="loading"></cf-spinner>
        <cf-empty-state *ngIf="!loading && error" icon="alert" title="Couldn't load messages" [message]="error"><button class="btn btn-outline btn-sm" (click)="load()">Retry</button></cf-empty-state>
        <cf-empty-state *ngIf="!loading && !error && data && !data.items.length" icon="inbox" [title]="box === 'inbox' ? 'No messages yet' : 'Nothing sent yet'" message="Messages from Craftify will appear here."></cf-empty-state>
        <ul *ngIf="!loading && data && data.items.length">
          <li *ngFor="let m of data.items" [class.unread]="box === 'inbox' && !m.isRead" [class.sel]="selected && selected.id === m.id" (click)="open(m)">
            <div class="top"><strong>{{ box === 'inbox' ? m.sender.name : 'To: ' + m.receiver.name }}</strong><small>{{ m.createdAt | date:'MMM d' }}</small></div>
            <div class="subj">{{ m.subject }}</div><div class="prev">{{ m.preview }}</div>
          </li>
        </ul>
        <cf-pagination *ngIf="data" [page]="data.page" [totalPages]="data.totalPages" (pageChange)="goTo($event)"></cf-pagination>
      </div>

      <div class="read panel">
        <button class="back" (click)="close()">← Back to messages</button>
        <cf-spinner *ngIf="detailLoading"></cf-spinner>

        <ng-container *ngIf="!composing && selected && !detailLoading">
          <h2>{{ selected.subject }}</h2>
          <p class="meta">From <strong>{{ selected.sender.name }}</strong> <span *ngIf="selected.sender.fromAdmin" class="status status-confirmed">Craftify</span> · {{ selected.createdAt | date:'medium' }}</p>
          <div class="pre body">{{ selected.message }}</div>
          <button class="btn btn-outline" *ngIf="selected.sender.fromAdmin" (click)="reply()"><cf-icon name="send" [size]="16"></cf-icon> Reply</button>
        </ng-container>

        <form *ngIf="composing" [formGroup]="form" (ngSubmit)="send()" novalidate>
          <h2>New message to Craftify</h2>
          <div class="alert alert-error" *ngIf="sendError">{{ sendError }}</div>
          <div class="field"><label>Subject</label><input class="input" formControlName="subject"><span class="error" *ngIf="form.get('subject').invalid && form.get('subject').touched">Subject is required.</span></div>
          <div class="field"><label>Message</label><textarea class="input" rows="8" formControlName="message"></textarea><span class="error" *ngIf="form.get('message').invalid && form.get('message').touched">Message cannot be empty.</span></div>
          <button class="btn btn-primary" type="submit" [disabled]="sending">{{ sending ? 'Sending…' : 'Send message' }}</button>
        </form>

        <cf-empty-state *ngIf="!selected && !composing && !detailLoading" icon="mail" title="Select a message" message="Choose a message to read it here."></cf-empty-state>
      </div>
    </div>`,
  styles: [`
    .mail { display: grid; grid-template-columns: 360px 1fr; gap: 18px; align-items: start; } .mail .panel + .panel { margin-top: 0; } .list { padding: 14px; }
    .list .tabs { margin-bottom: 10px; } ul { list-style: none; margin: 0; padding: 0; }
    li { padding: 13px 12px; border-radius: 12px; cursor: pointer; border-bottom: 1px solid var(--line); } li:hover { background: #FFFAF3; } li.sel { background: var(--brand-50); } li.unread .subj, li.unread strong { font-weight: 800; } li.unread::before { content: ''; float: right; width: 9px; height: 9px; border-radius: 50%; background: var(--brand-600); margin-top: 6px; }
    .top { display: flex; justify-content: space-between; gap: 8px; } small { color: var(--muted); } .subj { font-weight: 600; margin: 2px 0; } .prev { color: var(--muted); font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .read { min-height: 360px; } h2 { font-size: 1.5rem; } .meta { color: var(--muted); font-size: .9rem; } .body { padding: 18px 0 22px; color: var(--ink-soft); } .back { display: none; border: 0; background: none; color: var(--brand-700); font-weight: 600; margin-bottom: 12px; padding: 0; }
    @media (max-width: 900px) { .mail { grid-template-columns: 1fr; } .mail.reading .list { display: none; } .mail:not(.reading) .read { display: none; } .back { display: block; } }
  `],
})
export class MessagesComponent implements OnInit {
  box: 'inbox' | 'sent' = 'inbox';
  data: MessagePage | null = null;
  selected: Message | null = null;
  loading = true; detailLoading = false; error = ''; composing = false; sending = false; sendError = '';
  pageNo = 1;
  form = this.fb.group({ subject: ['', [Validators.required, Validators.maxLength(200)]], message: ['', [Validators.required, Validators.maxLength(5000)]] });

  constructor(private fb: FormBuilder, private api: MessageService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.list({ box: this.box, page: this.pageNo, limit: 12 }).subscribe(d => { this.data = d; this.loading = false; }, e => { this.error = e.message; this.loading = false; });
  }
  setBox(b: 'inbox' | 'sent'): void { this.box = b; this.pageNo = 1; this.selected = null; this.composing = false; this.load(); }
  goTo(p: number): void { this.pageNo = p; this.load(); }
  close(): void { this.selected = null; this.composing = false; }

  open(m: Message): void {
    this.composing = false; this.detailLoading = true;
    this.api.get(m.id).subscribe(full => {
      this.selected = full; this.detailLoading = false;
      if (this.box === 'inbox' && !m.isRead) {
        m.isRead = true;
        if (this.data) { this.data.unreadCount = Math.max(0, this.data.unreadCount - 1); }
        this.api.markRead(m.id).subscribe(() => {}, () => {});
      }
    }, e => { this.detailLoading = false; this.toast.error(e.message); });
  }

  compose(subject = ''): void { this.selected = null; this.composing = true; this.sendError = ''; this.form.reset({ subject, message: '' }); }
  reply(): void { this.compose('Re: ' + this.selected.subject.replace(/^Re:\s*/i, '')); }

  send(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.sending = true; this.sendError = '';
    this.api.send(this.form.value).subscribe(() => {
      this.sending = false; this.composing = false; this.toast.success('Message sent');
      if (this.box === 'sent') { this.load(); }
    }, e => { this.sending = false; this.sendError = e.message; });
  }
}
