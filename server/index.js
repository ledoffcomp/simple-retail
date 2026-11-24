import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & seed data
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

// Lookup product by barcode (fast for barcode scanner)
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
      unit || 'шт',
      Number(cost_price || 0),
      Number(retail_price),
      Number(stock || 0),
      Number(min_stock || 3)
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
      unit || 'шт',
      Number(cost_price || 0),
      Number(retail_price),
      Number(stock || 0),
      Number(min_stock || 3),
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
    const cats = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, color } = req.body;
    const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const result = stmt.run(name, color || '#3b82f6');
    res.json({ id: Number(result.lastInsertRowid), name, color });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CASH SHIFTS & OPERATIONS API
// ==========================================

// Get active shift
app.get('/api/shifts/current', (req, res) => {
  try {
    const shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      return res.json({ isOpen: false, shift: null });
    }

    // Calculate real-time shift statistics
    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN final_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN final_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'TRANSFER' THEN final_amount ELSE 0 END), 0) as transfer_sales,
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

    // Current cash in drawer = starting_cash + cash_sales + cash_in - cash_out
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

// Open shift
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
    const result = stmt.run(cashier_name || 'Администратор', Number(starting_cash || 0));
    res.json({ id: Number(result.lastInsertRowid), success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close shift (Z-report)
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

// Add cash operation (Внесение / Изъятие / Расход)
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
// 3. SALES & POS API (РМК)
// ==========================================

// Process sale
app.post('/api/sales', (req, res) => {
  try {
    const { items, payment_method, cash_received, discount_amount = 0 } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    // Get active shift
    let shift = db.prepare("SELECT id, cashier_name FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    if (!shift) {
      // Auto-open shift if forgotten
      const newShift = db.prepare("INSERT INTO cash_shifts (cashier_name, starting_cash, status) VALUES ('Администратор', 0, 'OPEN')").run();
      shift = { id: Number(newShift.lastInsertRowid), cashier_name: 'Администратор' };
    }

    // Generate unique receipt number: ЧЕК-XXXX
    const countSales = db.prepare("SELECT COUNT(*) as cnt FROM sales").get();
    const receipt_number = `ЧЕК-${String(countSales.cnt + 1).padStart(5, '0')}`;

    let total_amount = 0;
    let total_cost = 0;

    for (const item of items) {
      total_amount += Number(item.quantity) * Number(item.unit_price);
      total_cost += Number(item.quantity) * Number(item.cost_price || 0);
    }

    const final_amount = Math.max(0, total_amount - Number(discount_amount || 0));
    const profit = final_amount - total_cost;
    const change_returned = payment_method === 'CASH' ? Math.max(0, Number(cash_received || 0) - final_amount) : 0;

    // Begin database transaction
    db.exec('BEGIN TRANSACTION');
    try {
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          receipt_number, shift_id, cashier_name, total_amount, discount_amount,
          final_amount, payment_method, cash_received, change_returned, total_cost, profit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saleResult = saleStmt.run(
        receipt_number,
        shift.id,
        shift.cashier_name,
        total_amount,
        Number(discount_amount || 0),
        final_amount,
        payment_method,
        Number(cash_received || 0),
        change_returned,
        total_cost,
        profit
      );

      const sale_id = Number(saleResult.lastInsertRowid);

      const itemStmt = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price, cost_price, discount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        change_returned
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales history
app.get('/api/sales', (req, res) => {
  try {
    const { limit = 50, date } = req.query;
    let sql = `SELECT * FROM sales WHERE 1=1`;
    const params = [];

    if (date) {
      sql += ` AND date(created_at) = date(?)`;
      params.push(date);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(Number(limit));

    const sales = db.prepare(sql).all(...params);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single receipt details with items
app.get('/api/sales/:id', (req, res) => {
  try {
    const { id } = req.params;
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(id));
    if (!sale) return res.status(404).json({ error: 'Чек не найден' });

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(Number(id));
    res.json({ sale, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. INVENTORY & SUPPLIES API
// ==========================================

// Create supply (Приходная накладная)
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
        supplier || 'Основной поставщик',
        total_amount,
        comment || ''
      );
      const supply_id = Number(supplyResult.lastInsertRowid);

      const itemStmt = db.prepare(`
        INSERT INTO supply_items (supply_id, product_id, quantity, cost_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Update product stock and update cost_price (and optionally retail_price)
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

// List supplies
app.get('/api/supplies', (req, res) => {
  try {
    const supplies = db.prepare('SELECT * FROM supplies ORDER BY id DESC LIMIT 50').all();
    res.json(supplies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick inventory adjustment (Инвентаризация / Списание / Корректировка)
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
// 5. ANALYTICS & DASHBOARD KPI
// ==========================================

app.get('/api/analytics/summary', (req, res) => {
  try {
    // Today's summary
    const today = db.prepare(`
      SELECT 
        COALESCE(SUM(final_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(id) as receipts,
        CASE WHEN COUNT(id) > 0 THEN ROUND(SUM(final_amount) / COUNT(id), 2) ELSE 0 END as avg_check
      FROM sales
      WHERE date(created_at) = date('now', 'localtime') AND status = 'COMPLETED'
    `).get();

    // Yesterday's revenue for trend
    const yesterday = db.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as revenue 
      FROM sales 
      WHERE date(created_at) = date('now', '-1 day', 'localtime') AND status = 'COMPLETED'
    `).get();

    // Total products & low stock count
    const stockStats = db.prepare(`
      SELECT 
        COUNT(id) as total_products,
        COALESCE(SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(stock * cost_price), 0) as total_inventory_cost,
        COALESCE(SUM(stock * retail_price), 0) as total_inventory_retail
      FROM products
      WHERE is_active = 1
    `).get();

    // Last 7 days revenue chart
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

    // Top 5 selling products today / all time
    const topProducts = db.prepare(`
      SELECT 
        p.name,
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

    // Recent 5 sales
    const recentSales = db.prepare(`
      SELECT id, receipt_number, final_amount, payment_method, created_at
      FROM sales
      ORDER BY id DESC
      LIMIT 5
    `).all();

    res.json({
      today,
      yesterday,
      stockStats,
      last7Days,
      topProducts,
      recentSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. STORE SETTINGS API
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

// Fallback for SPA routing in production
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'API running. Frontend dev server is at http://localhost:5173' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Retail Server running at http://localhost:${PORT}`);
  console.log(`📱 Available on local network for smartphones and tablets!`);
});
