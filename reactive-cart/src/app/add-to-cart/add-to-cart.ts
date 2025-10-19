
import { Component } from '@angular/core';
import { NgFor, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../cart';
import { CatalogService } from '../catalog';

@Component({
  selector: 'app-add-to-cart',
  standalone: true,
  imports: [NgFor, FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './add-to-cart.html',
  styleUrls: ['./add-to-cart.css'],
})
export class AddToCartComponent {
  constructor(public cart: CartService, public catalog: CatalogService) {
    
    this.cart.loadOrderFromServer();
    this.catalog.loadFromServer();
    this.cart.setCustomerTimeZone('Africa/Cairo');
  }

  onSearch(q: string) { this.catalog.setQuery(q); }
  addProduct(id: string) {
    const p = this.catalog.getById(id);
    if (p) this.cart.addItem({ sku: p.sku, name: p.name, qty: 1, unitPrice: p.price });
  }
  pay() { this.cart.capturePayment(); }
  ship() { this.cart.markShipped(); }
  deliverTomorrow1630Utc() { this.cart.markDelivered(Date.UTC(2025, 9, 19, 16, 30, 0)); }
}
