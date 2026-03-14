import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get customer statement by share token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Decode token
    let tokenData: { customerId: string; startDate?: string; endDate?: string };
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      tokenData = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 });
    }

    const { customerId, startDate, endDate } = tokenData;

    // Get customer info
    const customerResult = await db.execute({
      sql: 'SELECT id, name, phone, notes FROM Customer WHERE id = ?',
      args: [customerId],
    });

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    const customer = customerResult.rows[0];

    // Build date filter conditions
    const startFilter = startDate ? new Date(startDate).toISOString() : null;
    const endFilter = endDate ? new Date(endDate + 'T23:59:59').toISOString() : null;

    // Get invoices
    let invoiceSql = `
      SELECT i.id, i.totalAmount, i.totalProfit, i.invoiceType, i.notes, i.createdAt,
             u.name as userName
      FROM Invoice i
      LEFT JOIN User u ON i.userId = u.id
      WHERE i.customerId = ? AND i.invoiceType IN ('credit', 'manual')
    `;
    const invoiceArgs: (string | number)[] = [customerId];

    if (startFilter) {
      invoiceSql += ' AND datetime(i.createdAt) >= datetime(?)';
      invoiceArgs.push(startFilter);
    }
    if (endFilter) {
      invoiceSql += ' AND datetime(i.createdAt) <= datetime(?)';
      invoiceArgs.push(endFilter);
    }

    invoiceSql += ' ORDER BY i.createdAt DESC';

    const invoicesResult = await db.execute({ sql: invoiceSql, args: invoiceArgs });

    // Get payments
    let paymentSql = `
      SELECT p.id, p.amount, p.notes, p.createdAt,
             u.name as userName
      FROM Payment p
      LEFT JOIN User u ON p.userId = u.id
      WHERE p.customerId = ?
    `;
    const paymentArgs: (string | number)[] = [customerId];

    if (startFilter) {
      paymentSql += ' AND datetime(p.createdAt) >= datetime(?)';
      paymentArgs.push(startFilter);
    }
    if (endFilter) {
      paymentSql += ' AND datetime(p.createdAt) <= datetime(?)';
      paymentArgs.push(endFilter);
    }

    paymentSql += ' ORDER BY p.createdAt DESC';

    const paymentsResult = await db.execute({ sql: paymentSql, args: paymentArgs });

    // Calculate previous balance (before startDate)
    let previousBalance = 0;
    if (startFilter) {
      // Get total debt before start date
      const previousDebtResult = await db.execute({
        sql: `
          SELECT COALESCE(SUM(totalAmount), 0) as totalDebt
          FROM Invoice
          WHERE customerId = ? AND invoiceType IN ('credit', 'manual')
            AND datetime(createdAt) < datetime(?)
        `,
        args: [customerId, startFilter],
      });

      // Get total paid before start date
      const previousPaidResult = await db.execute({
        sql: `
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM Payment
          WHERE customerId = ? AND datetime(createdAt) < datetime(?)
        `,
        args: [customerId, startFilter],
      });

      const previousDebt = (previousDebtResult.rows[0] as { totalDebt: number }).totalDebt;
      const previousPaid = (previousPaidResult.rows[0] as { totalPaid: number }).totalPaid;
      previousBalance = previousDebt - previousPaid;
    }

    // Build statement items
    const statement: Array<{
      type: 'previous' | 'invoice' | 'payment';
      id: string;
      date: string;
      description: string;
      amount: number;
      userName: string;
      notes: string | null;
      invoiceType?: string;
    }> = [];

    // Add previous balance as first item if filtering
    if (startFilter && previousBalance !== 0) {
      statement.push({
        type: 'previous',
        id: 'previous',
        date: startFilter,
        description: 'الرصيد السابق',
        amount: previousBalance,
        userName: '',
        notes: null,
      });
    }

    // Add invoices
    for (const invoice of invoicesResult.rows) {
      const inv = invoice as { id: string; totalAmount: number; invoiceType: string; notes: string | null; createdAt: string; userName: string };
      statement.push({
        type: 'invoice',
        id: inv.id,
        date: inv.createdAt,
        description: inv.invoiceType === 'manual' ? 'فاتورة يدوية' : 'فاتورة آجلة',
        amount: inv.totalAmount,
        userName: inv.userName,
        notes: inv.notes,
        invoiceType: inv.invoiceType,
      });
    }

    // Add payments
    for (const payment of paymentsResult.rows) {
      const pay = payment as { id: string; amount: number; notes: string | null; createdAt: string; userName: string };
      statement.push({
        type: 'payment',
        id: pay.id,
        date: pay.createdAt,
        description: 'سند قبض',
        amount: -pay.amount,
        userName: pay.userName,
        notes: pay.notes,
      });
    }

    // Sort by date
    statement.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If there's a previous balance, keep it first
    if (startFilter && previousBalance !== 0) {
      const previousIndex = statement.findIndex(s => s.type === 'previous');
      if (previousIndex > 0) {
        const [previousItem] = statement.splice(previousIndex, 1);
        statement.unshift(previousItem);
      }
    }

    // Calculate totals
    const totalDebt = statement.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);
    const totalPaid = statement.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
    const balance = previousBalance + statement
      .filter(s => s.type !== 'previous')
      .reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      filterInfo: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalDebt,
        totalPaid,
        balance,
        previousBalance,
        invoicesCount: invoicesResult.rows.length,
        paymentsCount: paymentsResult.rows.length,
      },
      statement,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get shared statement error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
