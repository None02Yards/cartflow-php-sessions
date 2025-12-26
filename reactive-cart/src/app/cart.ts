// src/app/cart.ts
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
    status: 'open',
  });

  // ─────────────────────────
  // Derived state
  // ─────────────────────────

  order = computed(() => this._order());

  /** Merge same-SKU items into one logical row */
  items = computed<CartItem[]>(() => {
    const map = new Map<string, CartItem>();

    for (const i of this._order().items) {
      const prev = map.get(i.sku);
      if (prev) {
        prev.qty += i.qty;
      } else {
        map.set(i.sku, { ...i });
      }
    }

    return Array.from(map.values());
  });

  subtotal = computed(() =>
    this.items().reduce((s, i) => s + i.qty * i.unitPrice, 0)
  );

  tax = computed(() =>
    Math.round(this.subtotal() * 0.10 * 100) / 100
  );

  total = computed(() =>
    Math.round((this.subtotal() + this.tax() + 7.99) * 100) / 100
  );

  etaUtcMs = computed(() =>
    this.dt.estimateDeliveryLocal(
      this._order().ts.shippedAtUtc ?? this._order().ts.createdAtUtc,
      this._order().shippingDays,
      this._order().customerTimeZone
    )
  );

  slaString = computed(() =>
    this.dt.diffAsString(Date.now(), this.etaUtcMs())
  );

  returnWindowOpen = computed(() =>
    this.dt.isReturnWindowOpen(this._order().ts.deliveredAtUtc, 14)
  );








  
  // ─────────────────────────
  // Lifecycle
  // ─────────────────────────

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
    if ((o as PurchaseOrder)?.id) {
      this._order.set(o as PurchaseOrder);
      return;
    }
    console.warn('[cart] unexpected payload', o);
  }

  private handleErr = (err: any) => {
    if (err?.status === 401) {
      this.router.navigateByUrl('/auth');
      return;
    }
    console.error('[cart] API error', err);
  };

  // ─────────────────────────
  // Server sync
  // ─────────────────────────

  loadOrderFromServer() {
    this.api.getOrder().subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  setCustomerTimeZone(tz: string) {
    this._order.update(o => ({ ...o, customerTimeZone: tz }));
  }

  // ─────────────────────────
  // Cart mutations (SAFE)
  // ─────────────────────────

  /** Add ONE unit of a product */
  add(item: Omit<CartItem, 'qty'>) {
    this.api.addToCart({ ...item, qty: 1 }).subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  /** Increase quantity */
increment(item: CartItem) {
  this.api.addToCart({
    sku: item.sku,
    name: item.name,
    qty: 1,
    unitPrice: item.unitPrice,
  }).subscribe({
    next: o => this.handleAuthOrSet(o),
    error: this.handleErr,
  });
}

decrement(item: CartItem) {
  const current = this._order().items.find(i => i.sku === item.sku);
  if (!current || current.qty <= 1) return;

  const updated = this._order().items.map(i =>
    i.sku === item.sku ? { ...i, qty: i.qty - 1 } : i
  );

  this._order.update(o => ({ ...o, items: updated }));
}

  // ─────────────────────────
  // Checkout lifecycle
  // ─────────────────────────

  capturePayment() {
    this.api.pay().subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  markShipped() {
    this.api.ship().subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  markDelivered(ms: number) {
    this.api.deliver(ms).subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  startNewOrder() {
    this.api.reset().subscribe({
      next: o => this.handleAuthOrSet(o),
      error: this.handleErr,
    });
  }

  // ─────────────────────────
  // Formatting helpers
  // ─────────────────────────

  fmt(utcMs?: number, pattern?: Intl.DateTimeFormatOptions): string {
    if (!utcMs) return '—';
    return this.dt.formatInTz(
      utcMs,
      this._order().customerTimeZone,
      pattern
    );
  }

  header(): string {
    return this.dt.localizedHeader(
      Date.now(),
      this._order().customerTimeZone
    );
  }
}
