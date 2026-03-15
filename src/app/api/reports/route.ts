import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');
    
    if (type === 'low-stock') {
      // Get products with their units
      const productsResult = await db.execute(`
        SELECT p.*, pu.id as unitId, pu.unitName, pu.stockQuantity, pu.unitType, pu.containsPieces
        FROM Product p
        LEFT JOIN ProductUnit pu ON p.id = pu.productId
        ORDER BY p.name, pu.containsPieces DESC
      `);
      
      // Group by product and check if any unit is low
      const lowStockProducts: Array<{
        id: string;
        name: string;
        units: Array<{ unitName: string; stockQuantity: number }>;
        minStock: number;
      }> = [];
      
      const productMap = new Map();
      
      for (const row of productsResult.rows) {
        if (!productMap.has(row.id)) {
          productMap.set(row.id, {
            id: row.id,
            name: row.name,
            alertLimit: row.alertLimit,
            units: [],
          });
        }
        
        if (row.unitId) {
          productMap.get(row.id).units.push({
            unitName: row.unitName,
            stockQuantity: row.stockQuantity,
            unitType: row.unitType,
            containsPieces: row.containsPieces,
          });
        }
      }
      
      // Check for low stock (compare pieces to alert limit)
      for (const product of productMap.values()) {
        let totalPieces = 0;
        for (const unit of product.units) {
          totalPieces += (unit.stockQuantity as number) * (unit.containsPieces as number);
        }
        
        if (totalPieces <= product.alertLimit) {
          lowStockProducts.push({
            id: product.id,
            name: product.name,
            units: product.units,
            minStock: totalPieces,
          });
        }
      }
      
      return NextResponse.json(lowStockProducts);
    }
    
    if (type === 'users') {
      // Note: Exclude 'manual' invoices from sales/profit calculations
      let sql = `
        SELECT u.id, u.name, 
               COUNT(DISTINCT i.id) as totalInvoices,
               COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalAmount ELSE 0 END), 0) as totalSales,
               COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalProfit ELSE 0 END), 0) as totalProfit
        FROM User u
        LEFT JOIN Invoice i ON u.id = i.userId
      `;
      const args: (string | number)[] = [];
      const conditions: string[] = [];
      
      // Use datetime if provided, otherwise use date
      const startFilter = startDateTime || startDate;
      const endFilter = endDateTime || endDate;
      
      if (startFilter) {
        conditions.push("(i.createdAt IS NULL OR datetime(i.createdAt) >= datetime(?))");
        args.push(startFilter);
      }
      
      if (endFilter) {
        conditions.push("(i.createdAt IS NULL OR datetime(i.createdAt) <= datetime(?))");
        args.push(endFilter);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' GROUP BY u.id ORDER BY totalSales DESC';
      
      const result = await db.execute({ sql, args });
      
      return NextResponse.json(result.rows);
    }

    // User-specific report
    if (type === 'user-report' && userId) {
      // Note: Exclude 'manual' invoices from sales/profit calculations
      let sql = `
        SELECT
          COUNT(DISTINCT i.id) as totalInvoices,
          COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalAmount ELSE 0 END), 0) as totalSales,
          COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalProfit ELSE 0 END), 0) as totalProfit
        FROM Invoice i
        WHERE i.userId = ?
      `;
      const args: (string | number)[] = [userId];

      const startFilter = startDateTime || startDate;
      const endFilter = endDateTime || endDate;

      if (startFilter) {
        sql += " AND datetime(i.createdAt) >= datetime(?)";
        args.push(startFilter);
      }

      if (endFilter) {
        sql += " AND datetime(i.createdAt) <= datetime(?)";
        args.push(endFilter);
      }

      const result = await db.execute({ sql, args });

      // Get user info
      const userResult = await db.execute({
        sql: 'SELECT id, name, email FROM User WHERE id = ?',
        args: [userId],
      });

      return NextResponse.json({
        user: userResult.rows[0] || null,
        totalInvoices: result.rows[0]?.totalInvoices || 0,
        totalSales: result.rows[0]?.totalSales || 0,
        totalProfit: result.rows[0]?.totalProfit || 0,
      });
    }

    // Detailed report with transactions
    if (type === 'detailed') {
      const startFilter = startDateTime || startDate;
      const endFilter = endDateTime || endDate;

      // Build base conditions
      const invoiceConditions: string[] = [];
      const paymentConditions: string[] = [];
      const invoiceArgs: (string | number)[] = [];
      const paymentArgs: (string | number)[] = [];

      if (startFilter) {
        invoiceConditions.push("datetime(i.createdAt) >= datetime(?)");
        invoiceArgs.push(startFilter);
        paymentConditions.push("datetime(p.createdAt) >= datetime(?)");
        paymentArgs.push(startFilter);
      }

      if (endFilter) {
        invoiceConditions.push("datetime(i.createdAt) <= datetime(?)");
        invoiceArgs.push(endFilter);
        paymentConditions.push("datetime(p.createdAt) <= datetime(?)");
        paymentArgs.push(endFilter);
      }

      if (userId) {
        invoiceConditions.push("i.userId = ?");
        invoiceArgs.push(userId);
        paymentConditions.push("p.userId = ?");
        paymentArgs.push(userId);
      }

      const invoiceWhere = invoiceConditions.length > 0 ? 'WHERE ' + invoiceConditions.join(' AND ') : '';
      const paymentWhere = paymentConditions.length > 0 ? 'WHERE ' + paymentConditions.join(' AND ') : '';

      // Get sales invoices (cash and credit)
      const salesInvoices = await db.execute({
        sql: `
          SELECT i.id, i.totalAmount, i.totalProfit, i.invoiceType, i.createdAt,
                 i.customerId, c.name as customerName, u.name as userName
          FROM Invoice i
          LEFT JOIN Customer c ON i.customerId = c.id
          LEFT JOIN User u ON i.userId = u.id
          ${invoiceWhere}
        `,
        args: invoiceArgs,
      });

      // Get purchase invoices
      const purchaseInvoices = await db.execute({
        sql: `
          SELECT i.id, i.totalAmount, i.createdAt, u.name as userName
          FROM PurchaseInvoice i
          LEFT JOIN User u ON i.userId = u.id
          ${invoiceWhere.replace(/i\./g, 'i.')}
        `,
        args: invoiceArgs,
      });

      // Get payments
      const payments = await db.execute({
        sql: `
          SELECT p.id, p.amount, p.createdAt, p.customerId, c.name as customerName, u.name as userName
          FROM Payment p
          LEFT JOIN Customer c ON p.customerId = c.id
          LEFT JOIN User u ON p.userId = u.id
          ${paymentWhere}
        `,
        args: paymentArgs,
      });

      // Calculate stats
      let totalCashInvoices = 0;
      let totalCreditInvoices = 0;
      let totalProfit = 0;
      let totalDebts = 0;
      let totalPayments = 0;

      const transactions: Array<{
        id: string;
        type: 'cash_invoice' | 'credit_invoice' | 'purchase_invoice' | 'payment';
        date: string;
        amount: number;
        profit?: number;
        customerName?: string;
        userName: string;
      }> = [];

      // Process sales invoices
      for (const row of salesInvoices.rows) {
        const invoice = row as { id: string; totalAmount: number; totalProfit: number; invoiceType: string; createdAt: string; customerName: string | null; userName: string };

        if (invoice.invoiceType === 'cash') {
          totalCashInvoices += invoice.totalAmount;
          totalProfit += invoice.totalProfit;
          transactions.push({
            id: invoice.id,
            type: 'cash_invoice',
            date: invoice.createdAt,
            amount: invoice.totalAmount,
            profit: invoice.totalProfit,
            customerName: invoice.customerName || undefined,
            userName: invoice.userName,
          });
        } else if (invoice.invoiceType === 'credit' || invoice.invoiceType === 'manual') {
          totalCreditInvoices += invoice.totalAmount;
          totalDebts += invoice.totalAmount;
          if (invoice.invoiceType === 'credit') {
            totalProfit += invoice.totalProfit;
          }
          transactions.push({
            id: invoice.id,
            type: 'credit_invoice',
            date: invoice.createdAt,
            amount: invoice.totalAmount,
            profit: invoice.invoiceType === 'credit' ? invoice.totalProfit : undefined,
            customerName: invoice.customerName || undefined,
            userName: invoice.userName,
          });
        }
      }

      // Process purchase invoices
      for (const row of purchaseInvoices.rows) {
        const invoice = row as { id: string; totalAmount: number; createdAt: string; userName: string };
        transactions.push({
          id: invoice.id,
          type: 'purchase_invoice',
          date: invoice.createdAt,
          amount: invoice.totalAmount,
          userName: invoice.userName,
        });
      }

      // Process payments
      for (const row of payments.rows) {
        const payment = row as { id: string; amount: number; createdAt: string; customerName: string | null; userName: string };
        totalPayments += payment.amount;
        transactions.push({
          id: payment.id,
          type: 'payment',
          date: payment.createdAt,
          amount: payment.amount,
          customerName: payment.customerName || undefined,
          userName: payment.userName,
        });
      }

      // Sort by date descending
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalSales = totalCashInvoices + totalCreditInvoices + totalPayments;

      return NextResponse.json({
        stats: {
          totalSales,
          totalProfit,
          totalPayments,
          totalDebts,
          totalCashInvoices,
          totalCreditInvoices,
        },
        transactions,
      });
    }
    
    // Summary report
    // Note: 'manual' invoices are excluded from sales/profit but included in credit
    let sql = `
      SELECT 
        COUNT(DISTINCT i.id) as totalInvoices,
        COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalAmount ELSE 0 END), 0) as totalSales,
        COALESCE(SUM(CASE WHEN i.invoiceType != 'manual' THEN i.totalProfit ELSE 0 END), 0) as totalProfit,
        COALESCE(SUM(CASE WHEN i.invoiceType IN ('credit', 'manual') THEN i.totalAmount ELSE 0 END), 0) as totalCredit
      FROM Invoice i
      WHERE 1=1
    `;
    const args: (string | number)[] = [];
    
    const startFilter = startDateTime || startDate;
    const endFilter = endDateTime || endDate;
    
    if (startFilter) {
      sql += " AND datetime(i.createdAt) >= datetime(?)";
      args.push(startFilter);
    }
    
    if (endFilter) {
      sql += " AND datetime(i.createdAt) <= datetime(?)";
      args.push(endFilter);
    }
    
    if (userId) {
      sql += ' AND i.userId = ?';
      args.push(userId);
    }
    
    const result = await db.execute({ sql, args });

    // Calculate capital (total purchase price × quantity for all stock)
    const capitalResult = await db.execute(`
      SELECT COALESCE(SUM(stockQuantity * purchasePrice), 0) as totalCapital
      FROM ProductUnit
    `);
    const totalCapital = capitalResult.rows[0]?.totalCapital || 0;

    // Calculate outstanding debts (sum of positive customer balances)
    const outstandingDebtsResult = await db.execute(`
      SELECT
        c.id,
        COALESCE(debt.totalDebt, 0) - COALESCE(paid.totalPaid, 0) as balance
      FROM Customer c
      LEFT JOIN (
        SELECT customerId, SUM(totalAmount) as totalDebt
        FROM Invoice
        WHERE invoiceType IN ('credit', 'manual')
        GROUP BY customerId
      ) debt ON c.id = debt.customerId
      LEFT JOIN (
        SELECT customerId, SUM(amount) as totalPaid
        FROM Payment
        GROUP BY customerId
      ) paid ON c.id = paid.customerId
      WHERE COALESCE(debt.totalDebt, 0) - COALESCE(paid.totalPaid, 0) > 0
    `);

    const totalOutstandingDebts = outstandingDebtsResult.rows.reduce(
      (sum, row) => sum + (row.balance as number),
      0
    );

    return NextResponse.json({
      totalInvoices: result.rows[0].totalInvoices || 0,
      totalSales: result.rows[0].totalSales || 0,
      totalProfit: result.rows[0].totalProfit || 0,
      totalCredit: totalOutstandingDebts,
      totalCapital: totalCapital,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
