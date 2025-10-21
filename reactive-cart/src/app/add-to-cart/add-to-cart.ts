
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

import { CurrencyPipe, DecimalPipe } from '@angular/common';import { FormsModule } from '@angular/forms';
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
    DecimalPipe
  ],
  templateUrl: './add-to-cart.html',
  styleUrls: ['./add-to-cart.css'],
})
export class AddToCartComponent {
 constructor(
  public cart: CartService,
  public catalog: CatalogService,
  public auth: AuthService
) {
  this.auth.me();                // session probe on entry
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
