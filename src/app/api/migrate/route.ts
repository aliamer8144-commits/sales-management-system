import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Run migrations
export async function GET() {
  try {
    // Check if alertUnitType column exists in Product table
    const tableInfo = await db.execute({
      sql: "PRAGMA table_info(Product)",
      args: [],
    });
    
    const columns = tableInfo.rows.map((row) => row.name);
    const hasAlertUnitType = columns.includes('alertUnitType');
    
    if (!hasAlertUnitType) {
      // Add alertUnitType column to Product table
      await db.execute({
        sql: "ALTER TABLE Product ADD COLUMN alertUnitType TEXT DEFAULT 'piece'",
        args: [],
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم إضافة عمود alertUnitType بنجاح',
        addedColumn: 'alertUnitType'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'قاعدة البيانات محدثة، لا توجد تغييرات مطلوبة',
      columns: columns
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'حدث خطأ أثناء التحديث',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
