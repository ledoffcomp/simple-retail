import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & reset demo data
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend build if exists
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ==========================================
// 1. PRODUCTS & CATEGORIES API
// ==========================================

// Get all products with optional filters
app.get('/api/products', (req, res) => {
  try {
    const { search, category, low_stock } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name, c.color as category_color,
             ROUND(p.retail_price - p.cost_price, 2) as margin_rub,
             CASE WHEN p.cost_price > 0 
                  THEN ROUND(((p.retail_price - p.cost_price) / p.cost_price) * 100, 1)
                  ELSE 0 END as markup_percent
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ` AND p.category_id = ?`;
      params.push(Number(category));
    }

    if (low_stock === 'true') {
      sql += ` AND p.stock <= p.min_stock`;
    }

    sql += ` ORDER BY p.name ASC`;
    const stmt = db.prepare(sql);
    const products = stmt.all(...params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lookup product by barcode
app.get('/api/products/barcode/:barcode', (req, res) => {
  try {
    const { barcode } = req.params;
    const stmt = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.barcode = ? OR p.sku = ?) AND p.is_active = 1
    `);
    const product = stmt.get(barcode, barcode);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', (req, res) => {
  try {
    const { barcode, sku, name, category_id, unit, cost_price, retail_price, stock, min_stock } = req.body;
    if (!name || retail_price === undefined) {
      return res.status(400).json({ error: 'Наименование и розничная цена обязательны' });
    }

    const stmt = db.prepare(`
      INSERT INTO products (barcode, sku, name, category_id, unit, cost_price, retail_price, stock, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      barcode || null,
      sku || null,
      name,
      category_id || null,
      unit || 'м.п.',
      Number(cost_price || 0),
      Number(retail_price),
      Number(stock || 0),
      Number(min_stock || 5)
    );
    res.json({ id: Number(result.lastInsertRowid), success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { barcode, sku, name, category_id, unit, cost_price, retail_price, stock, min_stock } = req.body;

    const stmt = db.prepare(`
      UPDATE products
      SET barcode = ?, sku = ?, name = ?, category_id = ?, unit = ?,
          cost_price = ?, retail_price = ?, stock = ?, min_stock = ?
      WHERE id = ?
    `);
    stmt.run(
      barcode || null,
      sku || null,
      name,
      category_id || null,
      unit || 'м.п.',
      Number(cost_price || 0),
      Number(retail_price),
      Number(stock || 0),
      Number(min_stock || 5),
      Number(id)
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (soft delete)
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  try {
    const cats = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, color } = req.body;
    const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const result = stmt.run(name, color || '#6531f7');
    res.json({ id: Number(result.lastInsertRowid), name, color });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CASH SHIFTS & OPERATIONS API
// ==========================================

app.get('/api/shifts/current', (req, res) => {
  try {
    const shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      return res.json({ isOpen: false, shift: null });
    }

    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN final_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN final_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'TRANSFER' THEN final_amount ELSE 0 END), 0) as transfer_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'DEBT' THEN final_amount ELSE 0 END), 0) as debt_sales,
        COALESCE(SUM(final_amount), 0) as total_sales,
        COALESCE(SUM(profit), 0) as total_profit,
        COUNT(id) as receipt_count
      FROM sales
      WHERE shift_id = ? AND status = 'COMPLETED'
    `).get(shift.id);

    const ops = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) as cash_in,
        COALESCE(SUM(CASE WHEN type IN ('OUT', 'EXPENSE') THEN amount ELSE 0 END), 0) as cash_out
      FROM cash_operations
      WHERE shift_id = ?
    `).get(shift.id);

    const expectedCashInDrawer = shift.starting_cash + stats.cash_sales + ops.cash_in - ops.cash_out;

    res.json({
      isOpen: true,
      shift: {
        ...shift,
        stats,
        ops,
        expectedCashInDrawer: Math.max(0, expectedCashInDrawer)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts/open', (req, res) => {
  try {
    const { cashier_name, starting_cash } = req.body;
    const existing = db.prepare("SELECT id FROM cash_shifts WHERE status = 'OPEN'").get();
    if (existing) {
      return res.status(400).json({ error: 'Смена уже открыта' });
    }

    const stmt = db.prepare(`
      INSERT INTO cash_shifts (cashier_name, starting_cash, status)
      VALUES (?, ?, 'OPEN')
    `);
    const result = stmt.run(cashier_name || 'Менеджер', Number(starting_cash || 0));
    res.json({ id: Number(result.lastInsertRowid), success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts/close', (req, res) => {
  try {
    const { closing_cash } = req.body;
    const shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      return res.status(400).json({ error: 'Нет открытой смены' });
    }

    const stats = db.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as total_sales FROM sales WHERE shift_id = ? AND status = 'COMPLETED'
    `).get(shift.id);

    const ops = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) as cash_in,
        COALESCE(SUM(CASE WHEN type IN ('OUT', 'EXPENSE') THEN amount ELSE 0 END), 0) as cash_out
      FROM cash_operations WHERE shift_id = ?
    `).get(shift.id);

    db.prepare(`
      UPDATE cash_shifts
      SET closed_at = CURRENT_TIMESTAMP,
          closing_cash = ?,
          total_sales = ?,
          cash_in = ?,
          cash_out = ?,
          status = 'CLOSED'
      WHERE id = ?
    `).run(Number(closing_cash || 0), stats.total_sales, ops.cash_in, ops.cash_out, shift.id);

    res.json({ success: true, shift_id: shift.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts/operation', (req, res) => {
  try {
    const { type, amount, category, comment } = req.body;
    const shift = db.prepare("SELECT id FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      return res.status(400).json({ error: 'Смена закрыта. Откройте смену для проведения кассовых операций.' });
    }

    const stmt = db.prepare(`
      INSERT INTO cash_operations (shift_id, type, amount, category, comment)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(shift.id, type, Number(amount), category || 'Прочее', comment || '');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. SALES & INVOICES (НАКЛАДНЫЕ И ПРОДАЖИ)
// ==========================================

app.post('/api/sales', (req, res) => {
  try {
    const { 
      items, 
      payment_method, 
      cash_received, 
      discount_amount = 0, 
      customer_name, 
      customer_phone,
      comment 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Список позиций пуст' });
    }

    // Get active shift
    let shift = db.prepare("SELECT id, cashier_name FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      const newShift = db.prepare("INSERT INTO cash_shifts (cashier_name, starting_cash, status) VALUES ('Менеджер', 0, 'OPEN')").run();
      shift = { id: Number(newShift.lastInsertRowid), cashier_name: 'Менеджер' };
    }

    // Unique invoice number: НАКЛ-XXXXX
    const countSales = db.prepare("SELECT COUNT(*) as cnt FROM sales").get();
    const receipt_number = `НАКЛ-${String(countSales.cnt + 1).padStart(5, '0')}`;

    let total_amount = 0;
    let total_cost = 0;

    for (const item of items) {
      total_amount += Number(item.quantity) * Number(item.unit_price);
      total_cost += Number(item.quantity) * Number(item.cost_price || 0);
    }

    const final_amount = Math.max(0, total_amount - Number(discount_amount || 0));
    const profit = final_amount - total_cost;
    
    // Debt calculation
    const is_debt = payment_method === 'DEBT' ? 1 : 0;
    const debt_amount = is_debt ? final_amount : 0;
    const debt_paid = 0;
    const change_returned = payment_method === 'CASH' ? Math.max(0, Number(cash_received || 0) - final_amount) : 0;

    db.exec('BEGIN TRANSACTION');
    try {
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          receipt_number, shift_id, cashier_name, customer_name, customer_phone,
          total_amount, discount_amount, final_amount, payment_method, cash_received,
          change_returned, is_debt, debt_amount, debt_paid, total_cost, profit, comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saleResult = saleStmt.run(
        receipt_number,
        shift.id,
        shift.cashier_name,
        customer_name || 'Розничный покупатель',
        customer_phone || '',
        total_amount,
        Number(discount_amount || 0),
        final_amount,
        payment_method,
        payment_method === 'CASH' ? Number(cash_received || 0) : (is_debt ? 0 : final_amount),
        change_returned,
        is_debt,
        debt_amount,
        debt_paid,
        total_cost,
        profit,
        comment || ''
      );

      const sale_id = Number(saleResult.lastInsertRowid);

      const itemStmt = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit, unit_price, cost_price, discount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stockStmt = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      for (const item of items) {
        const itemTotal = Number(item.quantity) * Number(item.unit_price);
        itemStmt.run(
          sale_id,
          item.product_id,
          item.product_name,
          item.barcode || '',
          Number(item.quantity),
          item.unit || 'м.п.',
          Number(item.unit_price),
          Number(item.cost_price || 0),
          0,
          itemTotal
        );
        stockStmt.run(Number(item.quantity), item.product_id);
      }

      db.exec('COMMIT');

      res.json({
        success: true,
        receipt_number,
        sale_id,
        final_amount,
        change_returned,
        is_debt,
        debt_amount
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales list with filters
app.get('/api/sales', (req, res) => {
  try {
    const { limit = 100, date, start_date, end_date } = req.query;
    let sql = `SELECT * FROM sales WHERE 1=1`;
    const params = [];

    if (date) {
      sql += ` AND date(created_at, 'localtime') = date(?)`;
      params.push(date);
    } else if (start_date && end_date) {
      sql += ` AND date(created_at, 'localtime') BETWEEN date(?) AND date(?)`;
      params.push(start_date, end_date);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(Number(limit));

    const sales = db.prepare(sql).all(...params);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single invoice details
app.get('/api/sales/:id', (req, res) => {
  try {
    const { id } = req.params;
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(id));
    if (!sale) return res.status(404).json({ error: 'Накладная не найдена' });

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(Number(id));
    const payments = db.prepare('SELECT * FROM debt_payments WHERE sale_id = ? ORDER BY id ASC').all(Number(id));

    res.json({ sale, items, payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. DEBT TRACKING API (ДОЛГОВЫЕ НАКЛАДНЫЕ)
// ==========================================

// Get all debts
app.get('/api/debts', (req, res) => {
  try {
    const debts = db.prepare(`
      SELECT s.*, 
             ROUND(s.debt_amount - s.debt_paid, 2) as remaining_debt
      FROM sales s
      WHERE s.is_debt = 1 AND (s.debt_amount - s.debt_paid) > 0.01
      ORDER BY s.id DESC
    `).all();

    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(debt_amount), 0) as total_debt_issued,
        COALESCE(SUM(debt_paid), 0) as total_debt_collected,
        COALESCE(SUM(debt_amount - debt_paid), 0) as total_debt_remaining,
        COUNT(id) as debtors_count
      FROM sales
      WHERE is_debt = 1 AND (debt_amount - debt_paid) > 0.01
    `).get();

    res.json({ debts, totals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pay debt
app.post('/api/debts/:sale_id/pay', (req, res) => {
  try {
    const { sale_id } = req.params;
    const { amount, payment_method = 'CASH', comment } = req.body;

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(sale_id));
    if (!sale) return res.status(404).json({ error: 'Накладная не найдена' });

    const payAmount = Number(amount);
    if (payAmount <= 0) return res.status(400).json({ error: 'Сумма оплаты должна быть больше нуля' });

    db.exec('BEGIN TRANSACTION');
    try {
      // Record payment
      db.prepare(`
        INSERT INTO debt_payments (sale_id, amount, payment_method, comment)
        VALUES (?, ?, ?, ?)
      `).run(sale.id, payAmount, payment_method, comment || 'Погашение долга');

      // Update sale debt_paid
      const newPaid = Number(sale.debt_paid || 0) + payAmount;
      db.prepare(`
        UPDATE sales SET debt_paid = ? WHERE id = ?
      `).run(newPaid, sale.id);

      // Register cash operation if paid in cash
      const openShift = db.prepare("SELECT id FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
      if (openShift && payment_method === 'CASH') {
        db.prepare(`
          INSERT INTO cash_operations (shift_id, type, amount, category, comment)
          VALUES (?, 'IN', ?, 'Погашение долга', ?)
        `).run(openShift.id, payAmount, `Погашение по ${sale.receipt_number} (${sale.customer_name})`);
      }

      db.exec('COMMIT');
      res.json({ success: true, remaining: Math.max(0, sale.debt_amount - newPaid) });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. SUPPLIES & INVENTORY API (СКЛАД)
// ==========================================

app.post('/api/supplies', (req, res) => {
  try {
    const { supplier, doc_number, items, comment } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Список товаров накладной пуст' });
    }

    let total_amount = 0;
    for (const item of items) {
      total_amount += Number(item.quantity) * Number(item.cost_price);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const supplyStmt = db.prepare(`
        INSERT INTO supplies (doc_number, supplier, total_amount, comment)
        VALUES (?, ?, ?, ?)
      `);
      const supplyResult = supplyStmt.run(
        doc_number || `ПН-${Date.now().toString().slice(-6)}`,
        supplier || 'Поставщик сырья',
        total_amount,
        comment || ''
      );
      const supply_id = Number(supplyResult.lastInsertRowid);

      const itemStmt = db.prepare(`
        INSERT INTO supply_items (supply_id, product_id, quantity, cost_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      const updateProdStmt = db.prepare(`
        UPDATE products 
        SET stock = stock + ?, cost_price = ?, retail_price = COALESCE(?, retail_price)
        WHERE id = ?
      `);

      for (const item of items) {
        const itemTotal = Number(item.quantity) * Number(item.cost_price);
        itemStmt.run(supply_id, item.product_id, Number(item.quantity), Number(item.cost_price), itemTotal);
        updateProdStmt.run(
          Number(item.quantity),
          Number(item.cost_price),
          item.retail_price ? Number(item.retail_price) : null,
          item.product_id
        );
      }

      db.exec('COMMIT');
      res.json({ success: true, supply_id });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/supplies', (req, res) => {
  try {
    const supplies = db.prepare('SELECT * FROM supplies ORDER BY id DESC LIMIT 50').all();
    res.json(supplies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/adjustment', (req, res) => {
  try {
    const { product_id, new_stock, reason } = req.body;
    const product = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(Number(product_id));
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(Number(new_stock), Number(product_id));
    res.json({ success: true, old_stock: product.stock, new_stock: Number(new_stock) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. ANALYTICS & PERIOD REPORTS
// ==========================================

app.get('/api/analytics/summary', (req, res) => {
  try {
    const today = db.prepare(`
      SELECT 
        COALESCE(SUM(final_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(id) as receipts,
        CASE WHEN COUNT(id) > 0 THEN ROUND(SUM(final_amount) / COUNT(id), 2) ELSE 0 END as avg_check
      FROM sales
      WHERE date(created_at, 'localtime') = date('now', 'localtime') AND status = 'COMPLETED'
    `).get();

    const yesterday = db.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as revenue 
      FROM sales 
      WHERE date(created_at, 'localtime') = date('now', '-1 day', 'localtime') AND status = 'COMPLETED'
    `).get();

    const stockStats = db.prepare(`
      SELECT 
        COUNT(id) as total_products,
        COALESCE(SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(stock * cost_price), 0) as total_inventory_cost,
        COALESCE(SUM(stock * retail_price), 0) as total_inventory_retail
      FROM products
      WHERE is_active = 1
    `).get();

    const debtStats = db.prepare(`
      SELECT 
        COALESCE(SUM(debt_amount - debt_paid), 0) as total_unpaid_debt,
        COUNT(id) as active_debtors
      FROM sales
      WHERE is_debt = 1 AND (debt_amount - debt_paid) > 0.01
    `).get();

    const last7Days = db.prepare(`
      SELECT 
        strftime('%d.%m', created_at, 'localtime') as day_label,
        date(created_at, 'localtime') as date_str,
        COALESCE(SUM(final_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(id) as receipts
      FROM sales
      WHERE created_at >= datetime('now', '-6 days', 'start of day') AND status = 'COMPLETED'
      GROUP BY date(created_at, 'localtime')
      ORDER BY date(created_at, 'localtime') ASC
    `).all();

    const topProducts = db.prepare(`
      SELECT 
        p.name,
        p.unit,
        COALESCE(SUM(si.quantity), 0) as units_sold,
        COALESCE(SUM(si.total_price), 0) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'COMPLETED'
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `).all();

    const categoryBreakdown = db.prepare(`
      SELECT 
        COALESCE(c.name, 'Без категории') as category_name,
        COALESCE(c.color, '#6531f7') as color,
        COALESCE(SUM(si.total_price), 0) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'COMPLETED'
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `).all();

    const recentSales = db.prepare(`
      SELECT id, receipt_number, customer_name, final_amount, payment_method, is_debt, debt_amount, debt_paid, created_at
      FROM sales
      ORDER BY id DESC
      LIMIT 8
    `).all();

    res.json({
      today,
      yesterday,
      stockStats,
      debtStats,
      last7Days,
      topProducts,
      categoryBreakdown,
      recentSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Period Analytics (Произвольный период)
app.get('/api/analytics/period', (req, res) => {
  try {
    let { start_date, end_date } = req.query;
    const sDate = start_date || '2000-01-01';
    const eDate = end_date || '2099-12-31';

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COUNT(id) as total_orders,
        COALESCE(SUM(CASE WHEN is_debt = 1 THEN (debt_amount - debt_paid) ELSE 0 END), 0) as period_unpaid_debt
      FROM sales
      WHERE date(created_at, 'localtime') BETWEEN date(?) AND date(?) AND status = 'COMPLETED'
    `).get(sDate, eDate);

    const itemsSold = db.prepare(`
      SELECT 
        p.name,
        p.unit,
        c.name as category_name,
        COALESCE(SUM(si.quantity), 0) as total_quantity,
        COALESCE(SUM(si.total_price), 0) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at, 'localtime') BETWEEN date(?) AND date(?) AND s.status = 'COMPLETED'
      GROUP BY p.id
      ORDER BY total_revenue DESC
    `).all(sDate, eDate);

    const dailyTrend = db.prepare(`
      SELECT 
        strftime('%d.%m', created_at, 'localtime') as day_label,
        date(created_at, 'localtime') as date_str,
        COALESCE(SUM(final_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(id) as orders
      FROM sales
      WHERE date(created_at, 'localtime') BETWEEN date(?) AND date(?) AND status = 'COMPLETED'
      GROUP BY date(created_at, 'localtime')
      ORDER BY date(created_at, 'localtime') ASC
    `).all(sDate, eDate);

    res.json({
      start_date: sDate,
      end_date: eDate,
      summary,
      itemsSold,
      dailyTrend
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. SETTINGS API
// ==========================================

app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      stmt.run(k, String(v));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean demo reset endpoint if requested
app.post('/api/admin/clean-reset', (req, res) => {
  try {
    initDatabase();
    res.json({ success: true, message: 'База данных очищена и подготовлена под VIP-Plast' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'API running. Frontend dev server is at http://localhost:5173' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VIP-Plast Retail Server running at http://localhost:${PORT}`);
});
