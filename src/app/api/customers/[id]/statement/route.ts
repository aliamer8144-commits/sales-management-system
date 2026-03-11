import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET customer statement (detailed account with invoices and payments)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Get customer info
    const customerResult = await db.execute({
      sql: 'SELECT * FROM Customer WHERE id = ?',
      args: [customerId],
    });
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }
    
    const customer = customerResult.rows[0];
    
    // Get credit invoices for this customer
    let invoicesSql = `
      SELECT i.*, u.name as userName
      FROM Invoice i
      LEFT JOIN User u ON i.userId = u.id
      WHERE i.customerId = ? AND i.invoiceType = 'credit'
    `;
    const invoicesArgs: (string | number)[] = [customerId];
    
    if (startDate) {
      invoicesSql += ` AND i.createdAt >= ?`;
      invoicesArgs.push(startDate);
    }
    
    if (endDate) {
      invoicesSql += ` AND i.createdAt <= ?`;
      invoicesArgs.push(endDate);
    }
    
    invoicesSql += ` ORDER BY i.createdAt DESC`;
    
    const invoicesResult = await db.execute({ sql: invoicesSql, args: invoicesArgs });
    
    // Get payments for this customer
    let paymentsSql = `
      SELECT p.*, u.name as userName
      FROM Payment p
      LEFT JOIN User u ON p.userId = u.id
      WHERE p.customerId = ?
    `;
    const paymentsArgs: (string | number)[] = [customerId];
    
    if (startDate) {
      paymentsSql += ` AND p.createdAt >= ?`;
      paymentsArgs.push(startDate);
    }
    
    if (endDate) {
      paymentsSql += ` AND p.createdAt <= ?`;
      paymentsArgs.push(endDate);
    }
    
    paymentsSql += ` ORDER BY p.createdAt DESC`;
    
    const paymentsResult = await db.execute({ sql: paymentsSql, args: paymentsArgs });
    
    // Calculate totals
    const totalDebt = invoicesResult.rows.reduce((sum, inv) => sum + (inv.totalAmount as number || 0), 0);
    const totalPaid = paymentsResult.rows.reduce((sum, pay) => sum + (pay.amount as number || 0), 0);
    const balance = totalDebt - totalPaid;
    
    // Combine invoices and payments into a statement (sorted by date)
    const statement = [
      ...invoicesResult.rows.map(inv => ({
        type: 'invoice' as const,
        id: inv.id,
        date: inv.createdAt,
        description: `فاتورة رقم ${inv.id?.slice(-6)}`,
        amount: inv.totalAmount,
        userName: inv.userName,
        notes: inv.notes,
      })),
      ...paymentsResult.rows.map(pay => ({
        type: 'payment' as const,
        id: pay.id,
        date: pay.createdAt,
        description: `قبض - ${pay.paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}`,
        amount: -(pay.amount as number),
        userName: pay.userName,
        notes: pay.notes,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        notes: customer.notes,
      },
      summary: {
        totalDebt,
        totalPaid,
        balance,
        invoicesCount: invoicesResult.rows.length,
        paymentsCount: paymentsResult.rows.length,
      },
      invoices: invoicesResult.rows.map(inv => ({
        id: inv.id,
        totalAmount: inv.totalAmount,
        totalProfit: inv.totalProfit,
        notes: inv.notes,
        userName: inv.userName,
        createdAt: inv.createdAt,
      })),
      payments: paymentsResult.rows.map(pay => ({
        id: pay.id,
        amount: pay.amount,
        paymentMethod: pay.paymentMethod,
        notes: pay.notes,
        userName: pay.userName,
        createdAt: pay.createdAt,
      })),
      statement,
    });
  } catch (error) {
    console.error('Get customer statement error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
