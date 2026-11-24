export interface Category {
  id: number;
  name: string;
  color?: string;
}

export interface Product {
  id: number;
  barcode: string | null;
  sku: string | null;
  name: string;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  unit: string;
  cost_price: number;
  retail_price: number;
  stock: number;
  min_stock: number;
  is_active: number;
  margin_rub?: number;
  markup_percent?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  total: number;
}

export interface ShiftStats {
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  total_sales: number;
  total_profit: number;
  receipt_count: number;
}

export interface ShiftOps {
  cash_in: number;
  cash_out: number;
}

export interface Shift {
  id: number;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  starting_cash: number;
  closing_cash: number | null;
  total_sales: number;
  status: 'OPEN' | 'CLOSED';
  stats?: ShiftStats;
  ops?: ShiftOps;
  expectedCashInDrawer?: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  shift_id: number;
  cashier_name: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';
  cash_received: number;
  change_returned: number;
  total_cost: number;
  profit: number;
  status: 'COMPLETED' | 'RETURNED';
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
}

export interface AnalyticsSummary {
  today: {
    revenue: number;
    profit: number;
    receipts: number;
    avg_check: number;
  };
  yesterday: {
    revenue: number;
  };
  stockStats: {
    total_products: number;
    low_stock_count: number;
    total_inventory_cost: number;
    total_inventory_retail: number;
  };
  last7Days: Array<{
    day_label: string;
    date_str: string;
    revenue: number;
    profit: number;
    receipts: number;
  }>;
  topProducts: Array<{
    name: string;
    units_sold: number;
    total_revenue: number;
  }>;
  recentSales: Array<{
    id: number;
    receipt_number: string;
    final_amount: number;
    payment_method: string;
    created_at: string;
  }>;
}

export interface StoreSettings {
  store_name?: string;
  store_address?: string;
  store_inn?: string;
  receipt_header?: string;
  receipt_footer?: string;
  currency?: string;
  default_cashier?: string;
}
