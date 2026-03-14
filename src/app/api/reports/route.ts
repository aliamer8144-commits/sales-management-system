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
