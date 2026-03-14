import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';

// GET all payments or payments for a specific customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT p.*, c.name as customerName, u.name as userName
      FROM Payment p
      LEFT JOIN Customer c ON p.customerId = c.id
      LEFT JOIN User u ON p.userId = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];
    
    if (customerId) {
      sql += ` AND p.customerId = ?`;
      args.push(customerId);
    }
    
    if (startDate) {
      sql += ` AND p.createdAt >= ?`;
      args.push(startDate);
    }
    
    if (endDate) {
      sql += ` AND p.createdAt <= ?`;
      args.push(endDate);
    }
    
    sql += ` ORDER BY p.createdAt DESC`;
    
    const result = await db.execute({ sql, args });
    
    return NextResponse.json(result.rows.map(row => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      userId: row.userId,
      userName: row.userName,
      createdAt: row.createdAt,
    })));
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, amount, paymentMethod, notes, userId } = body;
    
    if (!customerId || !amount || !userId) {
      return NextResponse.json({ error: 'البيانات غير كاملة' }, { status: 400 });
    }
    
    if (amount <= 0) {
      return NextResponse.json({ error: 'المبلغ يجب أن يكون أكبر من صفر' }, { status: 400 });
    }
    
    const paymentId = generateId();
    
    await db.execute({
      sql: `INSERT INTO Payment (id, customerId, amount, paymentMethod, notes, userId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [paymentId, customerId, amount, paymentMethod || 'cash', notes || null, userId],
    });
    
    // Get created payment with customer and user info
    const result = await db.execute({
      sql: `
        SELECT p.*, c.name as customerName, u.name as userName
        FROM Payment p
        LEFT JOIN Customer c ON p.customerId = c.id
        LEFT JOIN User u ON p.userId = u.id
        WHERE p.id = ?
      `,
      args: [paymentId],
    });
    
    return NextResponse.json({
      id: result.rows[0].id,
      customerId: result.rows[0].customerId,
      customerName: result.rows[0].customerName,
      amount: result.rows[0].amount,
      paymentMethod: result.rows[0].paymentMethod,
      notes: result.rows[0].notes,
      userId: result.rows[0].userId,
      userName: result.rows[0].userName,
      createdAt: result.rows[0].createdAt,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
