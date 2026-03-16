import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDate } from '@/lib/db';

// POST create a manual invoice (without products) for a customer
// This type of invoice:
// - Does not affect inventory
// - Does not affect sales/profit statistics
// - Only affects deferred amounts (المبالغ الآجلة)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, customerId, amount, notes } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }
    
    if (!customerId) {
      return NextResponse.json({ error: 'يجب تحديد العميل' }, { status: 400 });
    }
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'أدخل مبلغ صحيح' }, { status: 400 });
    }
    
    if (!notes || notes.trim() === '') {
      return NextResponse.json({ error: 'يجب كتابة ملاحظة للفاتورة' }, { status: 400 });
    }

    // Verify customer exists
    const customerResult = await db.execute({
      sql: 'SELECT id FROM Customer WHERE id = ?',
      args: [customerId],
    });
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    // Create manual invoice
    const invoiceId = generateId();
    const now = getCurrentDate();
    
    await db.execute({
      sql: `INSERT INTO Invoice (id, userId, customerId, invoiceType, totalAmount, totalProfit, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, 'manual', ?, 0, ?, ?, ?)`,
      args: [invoiceId, userId, customerId, amount, notes, now, now],
    });
    
    // Get created invoice
    const invoiceResult = await db.execute({
      sql: `SELECT i.*, u.name as userName, c.name as customerName 
            FROM Invoice i
            LEFT JOIN User u ON i.userId = u.id
            LEFT JOIN Customer c ON i.customerId = c.id
            WHERE i.id = ?`,
      args: [invoiceId],
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة الفاتورة اليدوية بنجاح',
      invoice: invoiceResult.rows[0],
    });
  } catch (error) {
    console.error('Create manual invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
