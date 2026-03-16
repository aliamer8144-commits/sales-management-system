import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET purchase invoice by ID with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get purchase invoice
    const invoiceResult = await db.execute({
      sql: `
        SELECT pi.*, u.name as userName
        FROM PurchaseInvoice pi
        LEFT JOIN User u ON pi.userId = u.id
        WHERE pi.id = ?
      `,
      args: [id],
    });

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'فاتورة المشتريات غير موجودة' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];

    // Get purchase invoice items
    const itemsResult = await db.execute({
      sql: `
        SELECT pii.*, p.name as productName
        FROM PurchaseInvoiceItem pii
        LEFT JOIN Product p ON pii.productId = p.id
        WHERE pii.purchaseInvoiceId = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      id: invoice.id,
      totalAmount: invoice.totalAmount,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      customer: null,
      user: {
        name: invoice.userName,
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitName: item.unitName,
        salePrice: item.purchasePrice,
        purchasePrice: item.purchasePrice,
      })),
    });
  } catch (error) {
    console.error('Get purchase invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
