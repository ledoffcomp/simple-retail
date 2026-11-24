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

db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6531f7'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      sku TEXT,
      name TEXT NOT NULL,
      category_id INTEGER,
      unit TEXT DEFAULT 'м.п.',
      cost_price REAL DEFAULT 0,
      retail_price REAL NOT NULL,
      stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cash_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_name TEXT DEFAULT 'Менеджер',
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
      cashier_name TEXT DEFAULT 'Менеджер',
      customer_name TEXT,
      customer_phone TEXT,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'CASH', 'CARD', 'TRANSFER', 'DEBT'
      cash_received REAL DEFAULT 0,
      change_returned REAL DEFAULT 0,
      is_debt INTEGER DEFAULT 0,
      debt_amount REAL DEFAULT 0,
      debt_paid REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED', -- 'COMPLETED', 'RETURNED'
      comment TEXT,
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
      unit TEXT DEFAULT 'м.п.',
      unit_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'CASH',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS supplies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_number TEXT NOT NULL,
      supplier TEXT DEFAULT 'Поставщик сырья',
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

  // Ensure customer columns exist in sales if migrating
  try {
    db.exec(`
      ALTER TABLE sales ADD COLUMN customer_name TEXT;
      ALTER TABLE sales ADD COLUMN customer_phone TEXT;
      ALTER TABLE sales ADD COLUMN is_debt INTEGER DEFAULT 0;
      ALTER TABLE sales ADD COLUMN debt_amount REAL DEFAULT 0;
      ALTER TABLE sales ADD COLUMN debt_paid REAL DEFAULT 0;
      ALTER TABLE sales ADD COLUMN comment TEXT;
    `);
  } catch (e) {
    // Columns already exist
  }

  // Clear all demo grocery products (coffee, cookies, milk, etc.)
  db.exec(`
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM supply_items;
    DELETE FROM supplies;
    DELETE FROM cash_operations;
    DELETE FROM products;
    DELETE FROM categories;
  `);

  // VIP-Plast Categories
  const categories = [
    { name: 'Подоконники ПВХ', color: '#6531f7' },
    { name: 'Отливы оконные (металл)', color: '#3b82f6' },
    { name: 'Сэндвич-панели', color: '#10b981' },
    { name: 'Комплектующие и заглушки', color: '#f59e0b' }
  ];

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)');
  for (const cat of categories) {
    insertCat.run(cat.name, cat.color);
  }

  // Set default VIP-Plast settings
  const defaultSettings = [
    ['store_name', 'VIP-Plast'],
    ['store_subtitle', 'Подоконники, отливы и сэндвич панели'],
    ['store_address', 'Производственно-складской комплекс'],
    ['store_phone', '+7 (999) 000-00-00'],
    ['store_inn', '770000000000'],
    ['receipt_header', 'VIP-Plast — Производство и продажа подоконников, отливов и сэндвич-панелей'],
    ['receipt_footer', 'Претензии по количеству и качеству принимаются в момент отгрузки со склада. Товар получен в полном объеме.'],
    ['currency', '₽'],
    ['default_cashier', 'Менеджер отдела продаж']
  ];
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  // Check shift
  const openShift = db.prepare("SELECT id FROM cash_shifts WHERE status = 'OPEN'").get();
  if (!openShift) {
    db.prepare("INSERT INTO cash_shifts (cashier_name, starting_cash, status) VALUES ('Менеджер', 0, 'OPEN')").run();
  }
}
