
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  User,
  CartItem,
  PurchaseOrder,
  DeliverResponse,
  ResetResponse,
  CatalogProduct, 
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:8081/api';
  private readonly json = new HttpHeaders({ 'Content-Type': 'application/json' });
  private readonly opts = { headers: this.json, withCredentials: true as const };

  signup(email: string, password: string): Observable<{ ok: true; user: User }> {
    return this.http.post<{ ok: true; user: User }>(
      `${this.apiBase}/signup`,
      { email, password },
      this.opts
    );
  }

  login(email: string, password: string): Observable<{ ok: true; user: User }> {
    return this.http.post<{ ok: true; user: User }>(
      `${this.apiBase}/login`,
      { email, password },
      this.opts
    );
  }

  logout(): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.apiBase}/logout`, {}, this.opts);
  }

  me(): Observable<{ user: User | null }> {
    return this.http.get<{ user: User | null }>(
      `${this.apiBase}/me`,
      { withCredentials: true }
    );
  }

  catalog(): Observable<{ products: CatalogProduct[] }> {
    return this.http.get<{ products: CatalogProduct[] }>(
      `${this.apiBase}/catalog`,
      { withCredentials: true }
    );
  }

  getOrder(): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(
      `${this.apiBase}/order`,
      { withCredentials: true }
    );
  }

  addToCart(item: CartItem & { unitPrice: number }): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.apiBase}/cart/add`,
      item,
      this.opts
    );
  }

  pay(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.apiBase}/order/pay`,
      {},
      this.opts
    );
  }

  ship(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.apiBase}/order/ship`,
      {},
      this.opts
    );
  }

  deliver(deliveredAtUtc?: number): Observable<DeliverResponse> {
    const body = deliveredAtUtc ? { deliveredAtUtc } : {};
    return this.http.post<DeliverResponse>(
      `${this.apiBase}/order/deliver`,
      body,
      this.opts
    );
  }

  reset(): Observable<ResetResponse> {
    return this.http.post<ResetResponse>(
      `${this.apiBase}/order/reset`,
      {},
      this.opts
    );
  }

  logs(limit = 200): Observable<{ count: number; events: any[] }> {
    return this.http.get<{ count: number; events: any[] }>(
      `${this.apiBase}/logs?limit=${encodeURIComponent(limit)}`,
      { withCredentials: true }
    );
  }

  export(): Observable<{ ok: boolean; file: string }> {
    return this.http.post<{ ok: boolean; file: string }>(
      `${this.apiBase}/export`,
      {},
      this.opts
    );
  }
}
