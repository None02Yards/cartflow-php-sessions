// E:\phpServer-cart\cartflow-php-sessions\reactive-cart\src\app\add-to-cart\add-to-cart.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

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

export class AddToCartComponent {
  constructor(
    public cart: CartService,
    public catalog: CatalogService,
    public auth: AuthService
  ) {
    this.auth.me();
    this.cart.loadOrderFromServer();
    this.catalog.loadFromServer();
    this.cart.setCustomerTimeZone('Africa/Cairo');
  }

 


ngOnInit() {
  this.catalog.products().forEach(p => {
    this.cart.add({
      sku: p.sku,
      name: p.name,
      unitPrice: p.price,
    });
  });
}

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

  pay() {
    this.cart.capturePayment();
  }

  ship() {
    this.cart.markShipped();
  }

  deliverTomorrow1630Utc() {
    this.cart.markDelivered(Date.UTC(2025, 9, 19, 16, 30, 0));
  }

  items() {
    return this.cart.items();
  }

  itemTotal(item: { qty: number; unitPrice: number }) {
    return item.qty * item.unitPrice;
  }

  itemsCount() {
    return this.cart.items().reduce((sum, i) => sum + i.qty, 0);
  }
}
