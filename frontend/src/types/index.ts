export type Role = 'owner' | 'manager' | 'cashier' | 'store_keeper' | 'accountant';

export interface AppUser {
  uid: string;
  full_name: string;
  username: string;
  email: string;
  role: Role;
}

export interface Fabric {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  material_type?: string;
  color_number?: string;
  color?: string;
  design_pattern?: string;
  width?: string;
  supplier_id?: string;
  purchase_price_yard: number;
  selling_price_yard: number;
  total_yards_purchased: number;
  remaining_yards: number;
  minimum_stock_level: number;
  storage_location?: string;
  image_url?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  total_spent: number;
  credit_balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  materials_supplied?: string;
  amount_owed: number;
}

export interface SaleItem {
  fabric_id: string;
  fabric_name: string;
  material_type?: string;
  color_number?: string;
  color?: string;
  yards: number;
  price_per_yard: number;
  amount: number;
}

export interface Sale {
  id: string;
  invoice_no: string;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  payment_status: 'paid' | 'partial' | 'credit';
  created_at: any;
}

export interface Credit {
  id: string;
  customer_id: string;
  customer_name?: string;
  sale_id: string;
  amount_owed: number;
  due_date?: any;
  status: 'on_track' | 'due_soon' | 'overdue' | 'cleared';
  created_at: any;
}

export interface Expense {
  id: string;
  category: string;
  description?: string;
  amount: number;
  expense_date: any;
  created_at?: any;
}

export interface DashboardStats {
  today_sales: number;
  monthly_revenue: number;
  net_profit: number;
  expenses_this_month: number;
  inventory_value: number;
  customer_credit_total: number;
  supplier_balance_total: number;
  low_stock_count: number;
  total_fabrics_count: number;
}
