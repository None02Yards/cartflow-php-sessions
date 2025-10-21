// src/app/api.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PurchaseOrder, CartItem } from './models';

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
}

export interface DeliverResponse {
  ok?: boolean;
  archivedFile?: string;
  newOrder?: PurchaseOrder;
}

export interface ResetResponse {
  ok: boolean;
  newOrder: PurchaseOrder;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://127.0.0.1:8000/api';   // switch for prod
  private opts = { withCredentials: true as const };

  constructor(private http: HttpClient) {}

  //  Catalog 
  getCatalog(): Observable<{ products: CatalogProduct[] }> {
    return this.http.get<{ products: CatalogProduct[] }>(`${this.base}/catalog`, this.opts);
  }

  //  Order read 
  getOrder(): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.base}/order`, this.opts);
  }

  // Cart / Order mutations
  addToCart(item: CartItem): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/cart/add`, item, this.opts);
  }

  pay(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/order/pay`, {}, this.opts);
  }

  ship(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/order/ship`, {}, this.opts);
  }


  deliver(ms: number): Observable<DeliverResponse | PurchaseOrder> {
    return this.http.post<DeliverResponse | PurchaseOrder>(
      `${this.base}/order/deliver`,
      { deliveredAtUtc: ms },
      this.opts
    );
  }

  /** Optional: manual reset without delivery */
  reset(): Observable<ResetResponse> {
    return this.http.post<ResetResponse>(`${this.base}/order/reset`, {}, this.opts);
  }
}

