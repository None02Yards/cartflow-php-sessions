import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule,],
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.css'],
})
export class AuthPageComponent {
  mode: 'signup' | 'login' = 'signup';
  email = '';
  password = '';
  error: string = '';
  busy = false;

  constructor(private auth: AuthService, private router: Router) {
    this.auth.me().subscribe({
      next: () => { if (this.auth.user()) this.router.navigateByUrl('/cart'); },
      error: () => {} // not logged in; stay here
    });
  }

  switch(mode: 'signup' | 'login') {
    this.mode = mode;
    this.error = '';
  }

submit() {
  this.error = '';
  this.busy = true;

  const email = this.email.trim();
  const pass = this.password;

  const req$ = this.mode === 'signup'
    ? this.auth.signup(email, pass)
    : this.auth.login(email, pass);

  req$.subscribe({
    next: () => {
      this.router.navigateByUrl('/cart');
    },
    error: (e: any) => {
      console.error('[auth] error', e);
      this.error =
        e?.error?.error ??
        e?.error?.message ??
        e?.message ??
        `${this.mode} failed`;
      this.busy = false;
    },
    complete: () => (this.busy = false),
  });
}


}
