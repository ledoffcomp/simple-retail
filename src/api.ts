import { Product, Category, Shift, Sale, SaleItem, DebtPayment, AnalyticsSummary, PeriodAnalytics, StoreSettings } from './types';

const API_BASE = '/api';

export const api = {
  // Products
  async getProducts(params?: { search?: string; category?: number; low_stock?: boolean }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', String(params.category));
    if (params?.low_stock) query.set('low_stock', 'true');
    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    return res.json();
  },

  async getProductByBarcode(barcode: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) throw new Error('Товар не найден');
    return res.json();
  },

  async saveProduct(product: Partial<Product>): Promise<{ id: number; success: boolean }> {
    const isEdit = Boolean(product.id);
    const url = isEdit ? `${API_BASE}/products/${product.id}` : `${API_BASE}/products`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },

  async deleteProduct(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    return res.json();
  },

  async addCategory(name: string, color?: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    return res.json();
  },

  // Shifts
  async getCurrentShift(): Promise<{ isOpen: boolean; shift: Shift | null }> {
    const res = await fetch(`${API_BASE}/shifts/current`);
    return res.json();
  },

  async openShift(cashier_name: string, starting_cash: number): Promise<{ id: number; success: boolean }> {
    const res = await fetch(`${API_BASE}/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashier_name, starting_cash }),
    });
    return res.json();
  },

  async closeShift(closing_cash: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/shifts/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closing_cash }),
    });
    return res.json();
  },

  async addCashOperation(data: { type: 'IN' | 'OUT' | 'EXPENSE'; amount: number; category: string; comment?: string }) {
    const res = await fetch(`${API_BASE}/shifts/operation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Sales (POS)
  async createSale(data: {
    items: Array<{
      product_id: number;
      product_name: string;
      barcode?: string | null;
      quantity: number;
      unit?: string;
      unit_price: number;
      cost_price: number;
    }>;
    payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'DEBT';
    cash_received?: number;
    discount_amount?: number;
    customer_name?: string;
    customer_phone?: string;
    is_debt?: boolean;
    debt_amount?: number;
    comment?: string;
  }): Promise<{ 
    success: boolean; 
    receipt_number: string; 
    sale_id: number; 
    final_amount: number; 
    change_returned: number;
    is_debt: number;
    debt_amount: number;
  }> {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка при проведении накладной');
    }
    return res.json();
  },

  async getSales(limit = 100, date?: string, start_date?: string, end_date?: string): Promise<Sale[]> {
    const query = new URLSearchParams();
    query.set('limit', String(limit));
    if (date) query.set('date', date);
    if (start_date && end_date) {
      query.set('start_date', start_date);
      query.set('end_date', end_date);
    }
    const res = await fetch(`${API_BASE}/sales?${query.toString()}`);
    return res.json();
  },

  async getSaleDetails(id: number): Promise<{ sale: Sale; items: SaleItem[]; payments: DebtPayment[] }> {
    const res = await fetch(`${API_BASE}/sales/${id}`);
    return res.json();
  },

  // Debts (Долги)
  async getDebts(): Promise<{ debts: Sale[]; totals: { total_debt_issued: number; total_debt_collected: number; total_debt_remaining: number; debtors_count: number } }> {
    const res = await fetch(`${API_BASE}/debts`);
    return res.json();
  },

  async payDebt(sale_id: number, amount: number, payment_method = 'CASH', comment?: string): Promise<{ success: boolean; remaining: number }> {
    const res = await fetch(`${API_BASE}/debts/${sale_id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, payment_method, comment }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка при внесении оплаты');
    }
    return res.json();
  },

  // Supplies & Inventory
  async createSupply(data: {
    supplier: string;
    doc_number?: string;
    items: Array<{ product_id: number; quantity: number; cost_price: number; retail_price?: number }>;
    comment?: string;
  }) {
    const res = await fetch(`${API_BASE}/supplies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getSupplies() {
    const res = await fetch(`${API_BASE}/supplies`);
    return res.json();
  },

  async adjustInventory(product_id: number, new_stock: number, reason?: string) {
    const res = await fetch(`${API_BASE}/inventory/adjustment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id, new_stock, reason }),
    });
    return res.json();
  },

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    return res.json();
  },

  async getPeriodAnalytics(start_date?: string, end_date?: string): Promise<PeriodAnalytics> {
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    const res = await fetch(`${API_BASE}/analytics/period?${params.toString()}`);
    if (!res.ok) throw new Error('Ошибка загрузки отчета за период');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async saveSettings(settings: StoreSettings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
