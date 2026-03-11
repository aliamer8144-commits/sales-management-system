import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    console.log('🔗 إنشاء الجداول في قاعدة البيانات السحابية...');

    // إنشاء جدول المستخدمين
    await db.execute(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول المنتجات
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Product (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        purchasePrice REAL NOT NULL DEFAULT 0,
        alertLimit INTEGER NOT NULL DEFAULT 5,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول العملاء
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Customer (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الفواتير
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Invoice (
        id TEXT PRIMARY KEY,
        invoiceType TEXT DEFAULT 'cash',
        totalAmount REAL DEFAULT 0,
        totalProfit REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        userId TEXT NOT NULL,
        customerId TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL
      )
    `);

    // إنشاء جدول عناصر الفاتورة
    await db.execute(`
      CREATE TABLE IF NOT EXISTS InvoiceItem (
        id TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL,
        salePrice REAL NOT NULL,
        purchasePrice REAL NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        invoiceId TEXT NOT NULL,
        productId TEXT NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
      )
    `);

    // إنشاء جدول فواتير المشتريات
    await db.execute(`
      CREATE TABLE IF NOT EXISTS PurchaseInvoice (
        id TEXT PRIMARY KEY,
        totalAmount REAL DEFAULT 0,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        userId TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      )
    `);

    // إنشاء جدول عناصر فاتورة المشتريات
    await db.execute(`
      CREATE TABLE IF NOT EXISTS PurchaseInvoiceItem (
        id TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL,
        purchasePrice REAL NOT NULL,
        unitType TEXT,
        unitName TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        purchaseInvoiceId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productUnitId TEXT NOT NULL,
        FOREIGN KEY (purchaseInvoiceId) REFERENCES PurchaseInvoice(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
      )
    `);

    // إنشاء الفهارس
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_user ON Invoice(userId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_customer ON Invoice(customerId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_invoice ON InvoiceItem(invoiceId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_product ON InvoiceItem(productId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_purchase_invoice_user ON PurchaseInvoice(userId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_purchase_item_invoice ON PurchaseInvoiceItem(purchaseInvoiceId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_purchase_item_product ON PurchaseInvoiceItem(productId)`);

    console.log('✅ تم إنشاء الجداول بنجاح');

    return NextResponse.json({ 
      success: true, 
      message: 'تم إنشاء جميع الجداول في قاعدة البيانات السحابية بنجاح ✓',
      tables: ['User', 'Product', 'Customer', 'Invoice', 'InvoiceItem', 'PurchaseInvoice', 'PurchaseInvoiceItem']
    });
  } catch (error) {
    console.error('Error creating tables:', error);
    return NextResponse.json({ 
      error: 'حدث خطأ أثناء إنشاء الجداول',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
