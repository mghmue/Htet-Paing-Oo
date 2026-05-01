export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface Product {
  id: number;
  name: string;
  total_stock: number;
}

export interface Location {
  id: number;
  name: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  location_id: number;
  location_name: string;
  user_id: number;
  user_name: string;
  quantity: number;
  type: 'in' | 'out';
  created_at: string;
}
