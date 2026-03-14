import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET payment by ID with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get payment
    const paymentResult = await db.execute({
      sql: `
        SELECT p.*, c.name as customerName, u.name as userName
        FROM Payment p
        LEFT JOIN Customer c ON p.customerId = c.id
        LEFT JOIN User u ON p.userId = u.id
        WHERE p.id = ?
      `,
      args: [id],
    });

    if (paymentResult.rows.length === 0) {
      return NextResponse.json({ error: 'سند القبض غير موجود' }, { status: 404 });
    }

    const payment = paymentResult.rows[0];

    return NextResponse.json({
      id: payment.id,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      createdAt: payment.createdAt,
      customer: payment.customerId ? {
        name: payment.customerName,
      } : null,
      user: {
        name: payment.userName,
      },
    });
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
