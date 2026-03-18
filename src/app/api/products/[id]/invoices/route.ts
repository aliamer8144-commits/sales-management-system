import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const invoiceType = searchParams.get('type'); // 'sales', 'purchases', or null for all

    // Build base queries
    let salesInvoices: any[] = [];
    let purchaseInvoices: any[] = [];

    // Fetch sales invoices if needed
    if (!invoiceType || invoiceType === 'sales') {
      let salesQuery = `
        SELECT 
          i.id,
          i.invoiceType,
          i.totalAmount,
          i.totalProfit,
          i.createdAt,
          i.customerId,
          c.name as customerName,
          ii.quantity,
          ii.salePrice,
          ii.purchasePrice as itemPurchasePrice
        FROM Invoice i
        INNER JOIN InvoiceItem ii ON i.id = ii.invoiceId
        LEFT JOIN Customer c ON i.customerId = c.id
        WHERE ii.productId = ?
      `;
      const salesParams: any[] = [id];

      if (startDate) {
        salesQuery += ` AND i.createdAt >= ?`;
        salesParams.push(startDate);
      }
      if (endDate) {
        salesQuery += ` AND i.createdAt <= ?`;
        salesParams.push(endDate + ' 23:59:59');
      }

      salesQuery += ` ORDER BY i.createdAt DESC`;

      const salesResult = await db.execute({
        sql: salesQuery,
        args: salesParams
      });
      salesInvoices = salesResult.rows.map((row: any) => ({
        ...row,
        type: 'sales',
        profit: (row.salePrice - row.itemPurchasePrice) * row.quantity
      }));
    }

    // Fetch purchase invoices if needed
    if (!invoiceType || invoiceType === 'purchases') {
      let purchaseQuery = `
        SELECT 
          pi.id,
          pi.totalAmount,
          pi.notes,
          pi.createdAt,
          pii.quantity,
          pii.purchasePrice,
          pii.unitType,
          pii.unitName
        FROM PurchaseInvoice pi
        INNER JOIN PurchaseInvoiceItem pii ON pi.id = pii.purchaseInvoiceId
        WHERE pii.productId = ?
      `;
      const purchaseParams: any[] = [id];

      if (startDate) {
        purchaseQuery += ` AND pi.createdAt >= ?`;
        purchaseParams.push(startDate);
      }
      if (endDate) {
        purchaseQuery += ` AND pi.createdAt <= ?`;
        purchaseParams.push(endDate + ' 23:59:59');
      }

      purchaseQuery += ` ORDER BY pi.createdAt DESC`;

      const purchaseResult = await db.execute({
        sql: purchaseQuery,
        args: purchaseParams
      });
      purchaseInvoices = purchaseResult.rows.map((row: any) => ({
        ...row,
        type: 'purchases',
        totalProfit: 0
      }));
    }

    // Combine and sort by date
    const allInvoices = [...salesInvoices, ...purchaseInvoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      invoices: allInvoices,
      salesCount: salesInvoices.length,
      purchaseCount: purchaseInvoices.length,
      totalCount: allInvoices.length
    });

  } catch (error) {
    console.error('Error fetching product invoices:', error);
    return NextResponse.json({
      error: 'حدث خطأ أثناء جلب الفواتير',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
