import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'retail.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      sku TEXT,
      name TEXT NOT NULL,
      category_id INTEGER,
      unit TEXT DEFAULT 'шт',
      cost_price REAL DEFAULT 0,
      retail_price REAL NOT NULL,
      stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 3,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cash_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_name TEXT DEFAULT 'Администратор',
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      starting_cash REAL DEFAULT 0,
      closing_cash REAL,
      total_sales REAL DEFAULT 0,
      total_returns REAL DEFAULT 0,
      cash_in REAL DEFAULT 0,
      cash_out REAL DEFAULT 0,
      status TEXT DEFAULT 'OPEN'
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      shift_id INTEGER,
      cashier_name TEXT DEFAULT 'Администратор',
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      cash_received REAL DEFAULT 0,
      change_returned REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shift_id) REFERENCES cash_shifts(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS supplies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_number TEXT NOT NULL,
      supplier TEXT DEFAULT 'Основной поставщик',
      total_amount REAL NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supply_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supply_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      cost_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY(supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS cash_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shift_id) REFERENCES cash_shifts(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Initialize default settings if empty
  const countSettings = db.prepare('SELECT COUNT(*) as cnt FROM settings').get();
  if (countSettings.cnt === 0) {
    const defaultSettings = [
      ['store_name', 'Магазин "У Дома"'],
      ['store_address', 'г. Москва, ул. Примерная, д. 10'],
      ['store_inn', '770123456789'],
      ['receipt_header', 'Добро пожаловать!'],
      ['receipt_footer', 'Спасибо за покупку! Ждем вас снова.'],
      ['currency', '₽'],
      ['default_cashier', 'Администратор']
    ];
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of defaultSettings) {
      insertSetting.run(k, v);
    }
  }

  // Seed default categories and products if empty
  const countProds = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (countProds.cnt === 0) {
    const categories = [
      { name: 'Напитки', color: '#06b6d4' },
      { name: 'Снеки и сладости', color: '#f59e0b' },
      { name: 'Молочная продукция', color: '#3b82f6' },
      { name: 'Бакалея', color: '#10b981' },
      { name: 'Бытовая химия', color: '#8b5cf6' }
    ];

    const insertCat = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const catMap = {};
    for (const cat of categories) {
      const res = insertCat.run(cat.name, cat.color);
      catMap[cat.name] = Number(res.lastInsertRowid);
    }

    const demoProducts = [
      { barcode: '4607001234567', sku: 'NAP-001', name: 'Кофе зерновой Espresso 250г', cat: 'Напитки', unit: 'шт', cost: 280, price: 490, stock: 24, min: 5 },
      { barcode: '4607001234574', sku: 'NAP-002', name: 'Вода минеральная без газа 0.5л', cat: 'Напитки', unit: 'шт', cost: 22, price: 55, stock: 48, min: 10 },
      { barcode: '4607001234581', sku: 'NAP-003', name: 'Сок Яблочный 1л Rich', cat: 'Напитки', unit: 'шт', cost: 85, price: 159, stock: 18, min: 6 },
      { barcode: '4607001234598', sku: 'SNK-001', name: 'Шоколад молочный Ritter Sport 100г', cat: 'Снеки и сладости', unit: 'шт', cost: 95, price: 175, stock: 32, min: 8 },
      { barcode: '4607001234604', sku: 'SNK-002', name: 'Печенье овсяное с изюмом 300г', cat: 'Снеки и сладости', unit: 'шт', cost: 65, price: 119, stock: 15, min: 5 },
      { barcode: '4607001234611', sku: 'MOL-001', name: 'Молоко пастеризованное 3.2% 930мл', cat: 'Молочная продукция', unit: 'шт', cost: 58, price: 89, stock: 20, min: 8 },
      { barcode: '4607001234628', sku: 'MOL-002', name: 'Сыр Российский классический 200г', cat: 'Молочная продукция', unit: 'шт', cost: 130, price: 219, stock: 12, min: 4 },
      { barcode: '4607001234635', sku: 'BAK-001', name: 'Чай черный листовой Greenfield 100г', cat: 'Бакалея', unit: 'шт', cost: 110, price: 195, stock: 22, min: 6 },
      { barcode: '4607001234642', sku: 'BAK-002', name: 'Макароны Barilla Спагетти 450г', cat: 'Бакалея', unit: 'шт', cost: 68, price: 115, stock: 30, min: 10 },
      { barcode: '4607001234659', sku: 'BYT-001', name: 'Средство для мытья посуды Fairy 450мл', cat: 'Бытовая химия', unit: 'шт', cost: 115, price: 189, stock: 14, min: 4 }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (barcode, sku, name, category_id, unit, cost_price, retail_price, stock, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of demoProducts) {
      insertProd.run(p.barcode, p.sku, p.name, catMap[p.cat], p.unit, p.cost, p.price, p.stock, p.min);
    }

    // Open first shift
    db.exec(`
      INSERT INTO cash_shifts (cashier_name, starting_cash, status)
      VALUES ('Администратор', 3000.0, 'OPEN');
    `);
  }
}
