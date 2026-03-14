import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET invoice by ID with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get invoice
    const invoiceResult = await db.execute({
      sql: `
        SELECT i.*, c.name as customerName, u.name as userName
        FROM Invoice i
        LEFT JOIN Customer c ON i.customerId = c.id
        LEFT JOIN User u ON i.userId = u.id
        WHERE i.id = ?
      `,
      args: [id],
    });

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];

    // Get invoice items
    const itemsResult = await db.execute({
      sql: `
        SELECT ii.*, p.name as productName
        FROM InvoiceItem ii
        LEFT JOIN Product p ON ii.productId = p.id
        WHERE ii.invoiceId = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      id: invoice.id,
      invoiceType: invoice.invoiceType,
      totalAmount: invoice.totalAmount,
      totalProfit: invoice.totalProfit,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      customer: invoice.customerId ? {
        name: invoice.customerName,
      } : null,
      user: {
        name: invoice.userName,
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitName: item.unitName,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
      })),
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
