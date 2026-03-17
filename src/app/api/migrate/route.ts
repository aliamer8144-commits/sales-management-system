import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Run migrations
export async function GET() {
  try {
    const migrations: string[] = [];

    // Check if alertUnitType column exists in Product table
    const productTableInfo = await db.execute({
      sql: "PRAGMA table_info(Product)",
      args: [],
    });

    const productColumns = productTableInfo.rows.map((row) => row.name);
    const hasAlertUnitType = productColumns.includes('alertUnitType');

    if (!hasAlertUnitType) {
      // Add alertUnitType column to Product table
      await db.execute({
        sql: "ALTER TABLE Product ADD COLUMN alertUnitType TEXT DEFAULT 'piece'",
        args: [],
      });
      migrations.push('alertUnitType');
    }

    // Check if salePrice column exists in ProductUnit table
    const unitTableInfo = await db.execute({
      sql: "PRAGMA table_info(ProductUnit)",
      args: [],
    });

    const unitColumns = unitTableInfo.rows.map((row) => row.name);
    const hasSalePrice = unitColumns.includes('salePrice');

    if (!hasSalePrice) {
      // Add salePrice column to ProductUnit table
      await db.execute({
        sql: "ALTER TABLE ProductUnit ADD COLUMN salePrice REAL DEFAULT 0",
        args: [],
      });
      migrations.push('salePrice');
    }

    if (migrations.length > 0) {
      return NextResponse.json({
        success: true,
        message: `تم إضافة الأعمدة بنجاح: ${migrations.join(', ')}`,
        addedColumns: migrations
      });
    }

    return NextResponse.json({
      success: true,
      message: 'قاعدة البيانات محدثة، لا توجد تغييرات مطلوبة',
      productColumns,
      unitColumns
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'حدث خطأ أثناء التحديث',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
