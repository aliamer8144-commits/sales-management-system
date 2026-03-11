import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';

// GET all customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    let sql = `
      SELECT c.*, 
        COALESCE(SUM(i.totalAmount), 0) as totalDebt,
        COUNT(i.id) as totalInvoices
      FROM Customer c
      LEFT JOIN Invoice i ON c.id = i.customerId AND i.invoiceType = 'credit'
    `;
    const args: string[] = [];
    
    if (search) {
      sql += ' WHERE c.name LIKE ?';
      args.push(`%${search}%`);
    }
    
    sql += ' GROUP BY c.id ORDER BY c.createdAt DESC';
    
    const result = await db.execute({ sql, args });
    
    return NextResponse.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalDebt: row.totalDebt || 0,
      totalInvoices: row.totalInvoices || 0,
    })));
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, notes } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'اسم العميل مطلوب' }, { status: 400 });
    }
    
    const id = generateId();
    
    await db.execute({
      sql: `INSERT INTO Customer (id, name, phone, notes, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [id, name, phone || null, notes || null],
    });
    
    const result = await db.execute({
      sql: 'SELECT * FROM Customer WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
