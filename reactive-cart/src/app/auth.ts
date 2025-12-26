// E:\phpServer-cart\cartflow-php-sessions\reactive-cart\src\app\auth.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User { id: string; email: string; }
interface MeResp { user: User | null; }

@Injectable({ providedIn: 'root' })
export class AuthService {
    private base = 'http://localhost:8081/api';

  private opts = { withCredentials: true as const };
  user = signal<User | null>(null);

  constructor(private http: HttpClient) {}

  me(): Observable<MeResp> {
    return this.http.get<MeResp>(`${this.base}/me`, this.opts).pipe(
      tap(r => this.user.set(r.user))
    );
  }

  signup(email: string, password: string): Observable<{ ok: boolean; user: User }> {
    return this.http.post<{ ok: boolean; user: User }>(
      `${this.base}/signup`, { email, password }, this.opts
    ).pipe(tap(r => this.user.set(r.user)));
  }

  login(email: string, password: string): Observable<{ ok: boolean; user: User }> {
    return this.http.post<{ ok: boolean; user: User }>(
      `${this.base}/login`, { email, password }, this.opts
    ).pipe(tap(r => this.user.set(r.user)));
  }

  logout() {
    return this.http.post<{ ok: boolean }>(`${this.base}/logout`, {}, this.opts).pipe(
      tap(() => this.user.set(null))
    );
  }
}
