// E:\phpServer-cart\cartflow-php-sessions\reactive-cart\src\app\models.ts
export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
}

export interface CartItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface OrderTimestamps {
  createdAtUtc: number;
  paidAtUtc?: number;
  shippedAtUtc?: number;
  deliveredAtUtc?: number;
}

export interface PurchaseOrder {
  id: string;
  items: CartItem[];
  ts: OrderTimestamps;
  customerTimeZone: string;
  shippingDays: number;
  status?: 'open' | 'delivered';
}

export interface User {
  id: string;
  email: string;
}

export interface DeliverResponse {
  ok: true;
  archivedFile: string;
  newOrder: PurchaseOrder;
}
//  backend sometimes return only { ok: true }, switch to:
// export type DeliverResponse {
//   | { ok: true; archivedFile: string; newOrder: PurchaseOrder }
//   | { ok: true };

export interface ResetResponse {
  ok: boolean;
  newOrder: PurchaseOrder;
}
