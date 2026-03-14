import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Add alertUnitType column to Product table
export async function GET() {
  try {
    // Add alertUnitType column to Product table
    await db.execute({
      sql: "ALTER TABLE Product ADD COLUMN alertUnitType TEXT DEFAULT 'piece'",
      args: [],
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'تم إضافة عمود alertUnitType بنجاح'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Column might already exist
    if (errorMessage.includes('duplicate column name')) {
      return NextResponse.json({ 
        success: true, 
        message: 'العمود موجود مسبقاً'
      });
    }
    
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'حدث خطأ أثناء التحديث',
      details: errorMessage
    }, { status: 500 });
  }
}
