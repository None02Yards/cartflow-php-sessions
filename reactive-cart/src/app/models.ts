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
  customerTimeZone: string;  // e.g., 'Africa/Cairo'
  shippingDays: number;      // e.g., 3.5
}
