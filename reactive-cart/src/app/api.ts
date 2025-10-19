import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PurchaseOrder } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://127.0.0.1:8000/api'; // switch to your host when deploying
  private opts = { withCredentials: true as const };

  constructor(private http: HttpClient) {}

  getCatalog(): Observable<{ products: Array<{id:string;sku:string;name:string;price:number}> }> {
    return this.http.get<{ products: any[] }>(`${this.base}/catalog`, this.opts);
  }
  getOrder(): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.base}/order`, this.opts);
  }
  addToCart(i:{sku:string;name:string;unitPrice:number;qty:number}): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/cart/add`, i, this.opts);
  }
  pay(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/order/pay`, {}, this.opts);
  }
  ship(): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/order/ship`, {}, this.opts);
  }
  deliver(ms:number): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/order/deliver`, { deliveredAtUtc: ms }, this.opts);
  }
}
