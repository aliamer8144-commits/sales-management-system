import { NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🌱 بدء إنشاء البيانات الافتراضية...');
    
    // التحقق من وجود جدول المستخدمين
    const tablesResult = await db.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='User'
    `);
    
    if (tablesResult.rows.length === 0) {
      // إنشاء الجداول
      console.log('📦 إنشاء الجداول...');
      
      // جدول المستخدمين
      await db.execute(`
        CREATE TABLE User (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // جدول المنتجات (بدون كمية وسعر - تنتقل للوحدات)
      await db.execute(`
        CREATE TABLE Product (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          alertLimit INTEGER NOT NULL DEFAULT 5,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // جدول وحدات المنتج
      await db.execute(`
        CREATE TABLE ProductUnit (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          unitType TEXT NOT NULL,
          unitName TEXT NOT NULL,
          purchasePrice REAL NOT NULL DEFAULT 0,
          containsPieces INTEGER NOT NULL DEFAULT 1,
          stockQuantity INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
        )
      `);
      
      // جدول العملاء
      await db.execute(`
        CREATE TABLE Customer (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // جدول الفواتير
      await db.execute(`
        CREATE TABLE Invoice (
          id TEXT PRIMARY KEY,
          invoiceType TEXT DEFAULT 'cash',
          totalAmount REAL DEFAULT 0,
          totalProfit REAL DEFAULT 0,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          userId TEXT NOT NULL,
          customerId TEXT,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL
        )
      `);
      
      // جدول عناصر الفاتورة
      await db.execute(`
        CREATE TABLE InvoiceItem (
          id TEXT PRIMARY KEY,
          quantity INTEGER NOT NULL,
          salePrice REAL NOT NULL,
          purchasePrice REAL NOT NULL,
          unitType TEXT NOT NULL,
          unitName TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          invoiceId TEXT NOT NULL,
          productId TEXT NOT NULL,
          productUnitId TEXT NOT NULL,
          FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE,
          FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE,
          FOREIGN KEY (productUnitId) REFERENCES ProductUnit(id) ON DELETE CASCADE
        )
      `);
      
      // الفهارس
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_product_unit_product ON ProductUnit(productId)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_user ON Invoice(userId)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_customer ON Invoice(customerId)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_invoice ON InvoiceItem(invoiceId)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_product ON InvoiceItem(productId)`);
      
      console.log('✅ تم إنشاء الجداول');
    }
    
    // التحقق من وجود جدول ProductUnit وإضافته إذا لم يكن موجوداً
    const productUnitCheck = await db.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ProductUnit'
    `);
    
    if (productUnitCheck.rows.length === 0) {
      console.log('📦 إضافة جدول وحدات المنتج...');
      
      await db.execute(`
        CREATE TABLE ProductUnit (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          unitType TEXT NOT NULL,
          unitName TEXT NOT NULL,
          purchasePrice REAL NOT NULL DEFAULT 0,
          containsPieces INTEGER NOT NULL DEFAULT 1,
          stockQuantity INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
        )
      `);
      
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_product_unit_product ON ProductUnit(productId)`);
      console.log('✅ تم إضافة جدول وحدات المنتج');
    }
    
    // إضافة عمود الملاحظات للفواتير إذا لم يكن موجوداً
    try {
      const invoiceColumns = await db.execute(`PRAGMA table_info(Invoice)`);
      const hasNotesColumn = invoiceColumns.rows.some((col: { name: string }) => col.name === 'notes');
      if (!hasNotesColumn) {
        await db.execute(`ALTER TABLE Invoice ADD COLUMN notes TEXT`);
        console.log('✅ تم إضافة عمود الملاحظات للفواتير');
      }
    } catch {
      // العمود موجود مسبقاً
    }
    
    // التحقق من وجود أعمدة الوحدات في InvoiceItem
    try {
      const itemColumns = await db.execute(`PRAGMA table_info(InvoiceItem)`);
      const hasUnitType = itemColumns.rows.some((col: { name: string }) => col.name === 'unitType');
      const hasUnitName = itemColumns.rows.some((col: { name: string }) => col.name === 'unitName');
      const hasProductUnitId = itemColumns.rows.some((col: { name: string }) => col.name === 'productUnitId');
      
      if (!hasUnitType) {
        await db.execute(`ALTER TABLE InvoiceItem ADD COLUMN unitType TEXT NOT NULL DEFAULT 'piece'`);
      }
      if (!hasUnitName) {
        await db.execute(`ALTER TABLE InvoiceItem ADD COLUMN unitName TEXT NOT NULL DEFAULT 'قطعة'`);
      }
      if (!hasProductUnitId) {
        await db.execute(`ALTER TABLE InvoiceItem ADD COLUMN productUnitId TEXT`);
      }
      console.log('✅ تم تحديث أعمدة InvoiceItem');
    } catch {
      // الأعمدة موجودة مسبقاً
    }
    
    // إنشاء حساب المدير
    const adminCheck = await db.execute({
      sql: 'SELECT id FROM User WHERE email = ?',
      args: ['admin@example.com'],
    });
    
    if (adminCheck.rows.length === 0) {
      console.log('👤 إنشاء حساب المدير...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.execute({
        sql: `INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) 
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [generateId(), 'admin@example.com', hashedPassword, 'مدير النظام', 'admin'],
      });
      console.log('✅ تم إنشاء حساب المدير');
    } else {
      console.log('ℹ️ حساب المدير موجود مسبقاً');
    }
    
    // إنشاء مستخدم تجريبي
    const userCheck = await db.execute({
      sql: 'SELECT id FROM User WHERE email = ?',
      args: ['user@example.com'],
    });
    
    if (userCheck.rows.length === 0) {
      console.log('👤 إنشاء حساب المستخدم...');
      const hashedPassword = await bcrypt.hash('user123', 10);
      
      await db.execute({
        sql: `INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) 
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [generateId(), 'user@example.com', hashedPassword, 'مستخدم تجريبي', 'user'],
      });
      console.log('✅ تم إنشاء حساب المستخدم');
    } else {
      console.log('ℹ️ حساب المستخدم موجود مسبقاً');
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'تم إنشاء البيانات الافتراضية بنجاح',
      admin: { email: 'admin@example.com', password: 'admin123' },
      user: { email: 'user@example.com', password: 'user123' }
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    return NextResponse.json({ 
      error: 'حدث خطأ',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
