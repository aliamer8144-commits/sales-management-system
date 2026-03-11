import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET single customer with invoices
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get customer
    const customerResult = await db.execute({
      sql: 'SELECT * FROM Customer WHERE id = ?',
      args: [id],
    });
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }
    
    // Get credit invoices
    const invoicesResult = await db.execute({
      sql: `SELECT i.*, u.name as userName FROM Invoice i 
            LEFT JOIN User u ON i.userId = u.id
            WHERE i.customerId = ? AND i.invoiceType = 'credit' 
            ORDER BY i.createdAt DESC`,
      args: [id],
    });
    
    // Get invoice items for each invoice
    const invoices = [];
    for (const invoice of invoicesResult.rows) {
      const itemsResult = await db.execute({
        sql: `SELECT ii.*, p.name as productName FROM InvoiceItem ii
              LEFT JOIN Product p ON ii.productId = p.id
              WHERE ii.invoiceId = ?`,
        args: [invoice.id],
      });
      
      invoices.push({
        ...invoice,
        items: itemsResult.rows,
      });
    }
    
    const totalDebt = invoices.reduce((sum: number, inv) => sum + (inv.totalAmount as number || 0), 0);
    
    return NextResponse.json({
      ...customerResult.rows[0],
      totalDebt,
      invoices,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, notes } = body;
    
    await db.execute({
      sql: `UPDATE Customer SET name = ?, phone = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [name, phone || null, notes || null, id],
    });
    
    const result = await db.execute({
      sql: 'SELECT * FROM Customer WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.execute({
      sql: 'DELETE FROM Customer WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
