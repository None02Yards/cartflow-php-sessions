import { Component } from '@angular/core';
import { AddToCartComponent } from '..//app/add-to-cart/add-to-cart';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AddToCartComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {}
