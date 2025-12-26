
import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './services/api.service';
import { CatalogProduct } from './models'; 

// export interface Product { id:string; sku:string; name:string; price:number; }
export type Product = CatalogProduct;
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly _products = signal<Product[]>([]);
  private readonly _query = signal<string>('');

  constructor(private api: ApiService) {}

  loadFromServer() {
    this.api.catalog().subscribe({
      next: ({ products }: { products: Product[] }) => this._products.set(products),
      error: (err) => console.error('[catalog] load failed', err),
    });
  }
  
   setQuery(q: string) { this._query.set(q.trim()); }

  products = computed(() => {
    const q = this._query().toLowerCase();
    const list = this._products();
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  });

    getById(id: string) { return this._products().find(p => p.id === id); }
}
