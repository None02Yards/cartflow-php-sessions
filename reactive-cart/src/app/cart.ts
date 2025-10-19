// import { Injectable, computed, signal } from '@angular/core';
// import type { CartItem, PurchaseOrder } from './models';
// import { DateTimeService } from './datetime';

// @Injectable({ providedIn: 'root' })
// export class CartService {
//   private readonly _order = signal<PurchaseOrder>({
//     id: 'PO-LOCAL',
//     items: [],
//     ts: { createdAtUtc: Date.now() },
//     customerTimeZone: 'Africa/Cairo',
//     shippingDays: 3.5,
//   });

//   order = computed(() => this._order());

//   // 👉 type the reducer params
//   subtotal = computed(() =>
//     this._order().items.reduce((s: number, i: CartItem) => s + i.qty * i.unitPrice, 0)
//   );

//   tax = computed(() => Math.round(this.subtotal() * 0.10 * 100) / 100);
//   total = computed(() => Math.round((this.subtotal() + this.tax() + 7.99) * 100) / 100);

//   etaUtcMs = computed(() => {
//     const o = this._order();
//     const base = o.ts.shippedAtUtc ?? o.ts.createdAtUtc;
//     return this.dt.estimateDeliveryLocal(base, o.shippingDays, o.customerTimeZone);
//   });

//   slaString = computed(() => this.dt.diffAsString(Date.now(), this.etaUtcMs()));
//   returnWindowOpen = computed(() => this.dt.isReturnWindowOpen(this._order().ts.deliveredAtUtc, 14));

//   constructor(private dt: DateTimeService) {}

//   setCustomerTimeZone(tz: string) {
//     this._order.update(o => ({ ...o, customerTimeZone: tz }));
//   }

//   setCreatedAtFromInput(input: string) {
//     const createdAtUtc = this.dt.parseUtc(input, true);
//     this._order.update(o => ({ ...o, ts: { ...o.ts, createdAtUtc } }));
//   }

//   addItem(item: CartItem) {
//     if (item.qty < 1) throw new Error('qty >= 1');
//     if (item.unitPrice < 0) throw new Error('price >= 0');
//     this._order.update(o => ({ ...o, items: [...o.items, item] }));
//   }

//   capturePayment(nowUtcMs = Date.now()) {
//     this._order.update(o => ({ ...o, ts: { ...o.ts, paidAtUtc: nowUtcMs } }));
//   }

//   markShipped(snapToCutoff = true, nowUtcMs = Date.now()) {
//     let ship = nowUtcMs;
//     if (snapToCutoff) {
//       const now = new Date(nowUtcMs);
//       const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 17, 0, 0);
//       ship = nowUtcMs > cutoff ? cutoff + 86_400_000 : cutoff;
//     }
//     this._order.update(o => ({ ...o, ts: { ...o.ts, shippedAtUtc: ship } }));
//   }

//   markDelivered(whenUtcMs: number) {
//     this._order.update(o => ({ ...o, ts: { ...o.ts, deliveredAtUtc: whenUtcMs } }));
//   }

//   fmt(utcMs?: number, pattern?: Intl.DateTimeFormatOptions): string {
//     if (!utcMs) return '—';
//     return this.dt.formatInTz(utcMs, this._order().customerTimeZone, pattern);
//     }

//   header(): string {
//     return this.dt.localizedHeader(Date.now(), this._order().customerTimeZone);
//   }
// }


import { Injectable, computed, signal } from '@angular/core';
import type { CartItem, PurchaseOrder } from './models';
import { DateTimeService } from './datetime';
import { ApiService } from './api';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _order = signal<PurchaseOrder>({
    id: 'PO-LOCAL', items: [], ts: { createdAtUtc: Date.now() }, customerTimeZone: 'Africa/Cairo', shippingDays: 3.5
  });

  order = computed(() => this._order());
  subtotal = computed(() => this._order().items.reduce((s: number, i: CartItem) => s + i.qty * i.unitPrice, 0));
  tax = computed(() => Math.round(this.subtotal() * 0.10 * 100) / 100);
  total = computed(() => Math.round((this.subtotal() + this.tax() + 7.99) * 100) / 100);
  etaUtcMs = computed(() => this.dt.estimateDeliveryLocal(
    (this._order().ts.shippedAtUtc ?? this._order().ts.createdAtUtc),
    this._order().shippingDays, this._order().customerTimeZone
  ));
  slaString = computed(() => this.dt.diffAsString(Date.now(), this.etaUtcMs()));
  returnWindowOpen = computed(() => this.dt.isReturnWindowOpen(this._order().ts.deliveredAtUtc, 14));

  constructor(private dt: DateTimeService, private api: ApiService) {}

  /** initial sync */
  loadOrderFromServer() {
    this.api.getOrder().subscribe(o => this._order.set(o));
  }

  setCustomerTimeZone(tz: string) { this._order.update(o => ({ ...o, customerTimeZone: tz })); }
  setCreatedAtFromInput(input: string) {  }

  addItem(item: CartItem) {
    if (item.qty < 1 || item.unitPrice < 0) throw new Error('invalid item');
    this.api.addToCart(item).subscribe(o => this._order.set(o));
  }
  capturePayment() { this.api.pay().subscribe(o => this._order.set(o)); }
  markShipped()     { this.api.ship().subscribe(o => this._order.set(o)); }
  markDelivered(ms:number) { this.api.deliver(ms).subscribe(o => this._order.set(o)); }

  fmt(utcMs?: number, pattern?: Intl.DateTimeFormatOptions): string {
    if (!utcMs) return '—';
    return this.dt.formatInTz(utcMs, this._order().customerTimeZone, pattern);
  }
  header(): string { return this.dt.localizedHeader(Date.now(), this._order().customerTimeZone); }
}
