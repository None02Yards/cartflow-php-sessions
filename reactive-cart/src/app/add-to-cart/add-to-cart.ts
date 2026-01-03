// E:\phpServer-cart\cartflow-php-sessions\reactive-cart\src\app\add-to-cart\add-to-cart.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CartService } from '../cart';
import { CatalogService } from '../catalog';
import { AuthService } from '../auth';

@Component({
  selector: 'app-add-to-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
  ],
  templateUrl: './add-to-cart.html',
  styleUrls: ['./add-to-cart.css'],
})
export class AddToCartComponent implements OnInit {

  constructor(
    public cart: CartService,
    public catalog: CatalogService,
    public auth: AuthService
  ) {
    // baseline bootstrapping (unchanged logic)
    this.auth.me();
    this.cart.loadOrderFromServer();
    this.catalog.loadFromServer();
    this.cart.setCustomerTimeZone('Africa/Cairo');
  }

  // ─────────────────────────
  // Lifecycle
  // ─────────────────────────

  ngOnInit(): void {
    // ❌ IMPORTANT:
    // We DO NOT auto-add catalog products into the cart.
    // The cart must reflect backend session state only.
  }

  // ─────────────────────────
  // Catalog actions
  // ─────────────────────────

  onSearch(q: string) {
    this.catalog.setQuery(q);
  }

  addProduct(id: string) {
    const p = this.catalog.getById(id);
    if (!p) return;

    this.cart.add({
      sku: p.sku,
      name: p.name,
      unitPrice: p.price,
    });
  }

  // ─────────────────────────
  // Quantity controls (SAFE, baseline)
  // ─────────────────────────

  increment(item: any) {
    this.cart.add({
      sku: item.sku,
      name: item.name,
      unitPrice: item.unitPrice,
    });
  }

  decrement(item: any) {
    if (item.qty <= 1) return;

    // local decrement only (backend decrement comes later)
    item.qty--;
  }


  remove(item: any) {
    const updated = this.cart
      .order()
      .items
      .filter(i => i !== item);

    // local replace only — no backend mutation
    (this.cart as any)._order.update((o: any) => ({
      ...o,
      items: updated,
    }));
  }

  // ─────────────────────────
  // Derived helpers (template-safe)
  // ─────────────────────────

  itemTotal(item: { qty: number; unitPrice: number }) {
    return item.qty * item.unitPrice;
  }

  itemsCount() {
    return this.cart.order().items.reduce(
      (sum, i) => sum + i.qty,
      0
    );
  }

  // ─────────────────────────
  // Checkout lifecycle
  // ─────────────────────────

  pay() {
    this.cart.capturePayment();
  }

  ship() {
    this.cart.markShipped();
  }

  deliverTomorrow1630Utc() {
    this.cart.markDelivered(
      Date.UTC(2025, 9, 19, 16, 30, 0)
    );
  }

//   removeBySku(sku: string) {
//   const updated = this.cart
//     .order()
//     .items
//     .filter(i => i.sku !== sku);

//   // local replace (baseline-safe)
//   (this.cart as any)._order.update(o => ({
//     ...o,
//     items: updated,
//   }));
// }
removeBySku(sku: string) {
  this.cart.removeBySku(sku);
}

checkout() {
  this.cart.checkout();
}



}
