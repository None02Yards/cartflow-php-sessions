
import { Injectable, computed, signal } from '@angular/core';
import type { CartItem, PurchaseOrder, DeliverResponse, ResetResponse } from './models';
import { DateTimeService } from './datetime';
import { ApiService } from './services/api.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _order = signal<PurchaseOrder>({
    id: 'PO-LOCAL',
    items: [],
    ts: { createdAtUtc: Date.now() },
    customerTimeZone: 'Africa/Cairo',
    shippingDays: 3.5,
  });

  order = computed(() => this._order());
  subtotal = computed(() =>
    this._order().items.reduce((s: number, i: CartItem) => s + i.qty * i.unitPrice, 0)
  );
  tax = computed(() => Math.round(this.subtotal() * 0.10 * 100) / 100);
  total = computed(() => Math.round((this.subtotal() + this.tax() + 7.99) * 100) / 100);

  etaUtcMs = computed(() =>
    this.dt.estimateDeliveryLocal(
      (this._order().ts.shippedAtUtc ?? this._order().ts.createdAtUtc),
      this._order().shippingDays,
      this._order().customerTimeZone
    )
  );
  slaString = computed(() => this.dt.diffAsString(Date.now(), this.etaUtcMs()));
  returnWindowOpen = computed(() => this.dt.isReturnWindowOpen(this._order().ts.deliveredAtUtc, 14));

  constructor(
    private dt: DateTimeService,
    private api: ApiService,
    private router: Router
  ) {}

private handleAuthOrSet(o: PurchaseOrder | DeliverResponse | ResetResponse) {
  if ((o as DeliverResponse)?.newOrder) {
    this._order.set((o as DeliverResponse).newOrder);
    return;
  }
  if ((o as ResetResponse)?.newOrder) {
    this._order.set((o as ResetResponse).newOrder);
    return;
  }
  if ((o as PurchaseOrder)?.id && Array.isArray((o as PurchaseOrder)?.items)) {
    this._order.set(o as PurchaseOrder);
    return;
  }
  console.warn('Unexpected order payload', o);
}


  private handleErr = (err: any) => {
    if (err?.status === 401) {
      this.router.navigateByUrl('/auth');
      return;
    }
    console.error('Cart API error', err);
  };

// Mutations / Queries 

loadOrderFromServer() {
  this.api.getOrder().subscribe({
    next: (o: PurchaseOrder) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

setCustomerTimeZone(tz: string) {
  this._order.update((o: PurchaseOrder) => ({ ...o, customerTimeZone: tz }));
}

setCreatedAtFromInput(input: string) {
  const d = new Date(input);
  const ms = Number.isFinite(+d) ? d.getTime() : Date.now();
  this._order.update((o: PurchaseOrder) => ({
    ...o,
    ts: { ...o.ts, createdAtUtc: ms },
  }));
}

addItem(item: CartItem) {
  if (item.qty < 1 || item.unitPrice < 0) {
    throw new Error('Invalid cart item');
  }

  this.api.addToCart(item).subscribe({
    next: (o: PurchaseOrder) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

capturePayment() {
  this.api.pay().subscribe({
    next: (o: PurchaseOrder) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

markShipped() {
  this.api.ship().subscribe({
    next: (o: PurchaseOrder) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

/**
 * Mark delivered manually!
 * Archives the current order to /data/orders/...
 * Backend resets session to a brand new order.
 * We immediately render the new empty order.
 */
markDelivered(ms: number) {
  this.api.deliver(ms).subscribe({
    next: (o: DeliverResponse) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

/** manual "start new order"  */
startNewOrder() {
  this.api.reset().subscribe({
    next: (o: ResetResponse) => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

fmt(utcMs?: number, pattern?: Intl.DateTimeFormatOptions): string {
  if (!utcMs) return '—';
  return this.dt.formatInTz(utcMs, this._order().customerTimeZone, pattern);
}

header(): string {
  return this.dt.localizedHeader(Date.now(), this._order().customerTimeZone);
}
}