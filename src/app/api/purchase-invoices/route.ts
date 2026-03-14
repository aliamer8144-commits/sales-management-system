import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';

// =============================================
// Helper functions for stock conversion
// =============================================

interface ProductUnitRow {
  id: string;
  productId: string;
  unitType: string;
  unitName: string;
  purchasePrice: number;
  containsPieces: number;
  stockQuantity: number;
}

// Convert all stock to pieces for calculation
function convertToPieces(units: ProductUnitRow[]): number {
  let totalPieces = 0;
  for (const unit of units) {
    totalPieces += (unit.stockQuantity as number) * (unit.containsPieces as number);
  }
  return totalPieces;
}

// Convert pieces back to cartons, packets, pieces
function convertFromPieces(totalPieces: number, units: ProductUnitRow[]): Map<string, number> {
  const result = new Map<string, number>();
  
  // Sort by containsPieces descending (carton first, then packet, then piece)
  const sortedUnits = [...units].sort((a, b) => (b.containsPieces as number) - (a.containsPieces as number));
  
  let remaining = totalPieces;
  
  for (const unit of sortedUnits) {
    const containsPieces = unit.containsPieces as number;
    const count = Math.floor(remaining / containsPieces);
    result.set(unit.id, count);
    remaining = remaining % containsPieces;
  }
  
  return result;
}

// Get all units for a product
async function getProductUnits(productId: string): Promise<ProductUnitRow[]> {
  const result = await db.execute({
    sql: `SELECT * FROM ProductUnit WHERE productId = ? ORDER BY 
          CASE unitType 
            WHEN 'carton' THEN 1 
            WHEN 'packet' THEN 2 
            WHEN 'piece' THEN 3 
            ELSE 4 
          END`,
    args: [productId],
  });
  return result.rows as ProductUnitRow[];
}

// Update stock for all units of a product
async function updateProductStock(productId: string, newStock: Map<string, number>): Promise<void> {
  for (const [unitId, quantity] of newStock) {
    await db.execute({
      sql: `UPDATE ProductUnit SET stockQuantity = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [quantity, unitId],
    });
  }
}

// =============================================
// API Routes
// =============================================

// GET all purchase invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');
    
    let sql = `
      SELECT pi.*, u.name as userName, u.email as userEmail
      FROM PurchaseInvoice pi
      LEFT JOIN User u ON pi.userId = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];
    
    if (userId) {
      sql += ' AND pi.userId = ?';
      args.push(userId);
    }
    
    // Use datetime if provided, otherwise use date
    const startFilter = startDateTime || startDate;
    const endFilter = endDateTime || endDate;
    
    if (startFilter) {
      sql += ' AND datetime(pi.createdAt) >= datetime(?)';
      args.push(startFilter);
    }
    
    if (endFilter) {
      sql += ' AND datetime(pi.createdAt) <= datetime(?)';
      args.push(endFilter);
    }
    
    sql += ' ORDER BY pi.createdAt DESC';
    
    const result = await db.execute({ sql, args });
    
    // Get items for each invoice
    const invoices = [];
    for (const row of result.rows) {
      const itemsResult = await db.execute({
        sql: `SELECT pii.*, p.name as productName 
              FROM PurchaseInvoiceItem pii
              LEFT JOIN Product p ON pii.productId = p.id
              WHERE pii.purchaseInvoiceId = ?`,
        args: [row.id],
      });
      
      invoices.push({
        id: row.id,
        totalAmount: row.totalAmount,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        user: {
          id: row.userId,
          name: row.userName,
          email: row.userEmail,
        },
        items: itemsResult.rows.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          unitType: item.unitType,
          unitName: item.unitName,
          productUnitId: item.productUnitId,
        })),
      });
    }
    
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Get purchase invoices error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new purchase invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notes, items } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'أضف منتج واحد على الأقل' }, { status: 400 });
    }

    // Group items by product for stock conversion
    const itemsByProduct = new Map<string, { productId: string; productUnitId: string; quantity: number; purchasePrice: number }[]>();
    
    for (const item of items) {
      // Get the product ID from the unit
      const unitResult = await db.execute({
        sql: 'SELECT productId FROM ProductUnit WHERE id = ?',
        args: [item.productUnitId],
      });
      
      if (unitResult.rows.length === 0) {
        return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 400 });
      }
      
      const productId = unitResult.rows[0].productId as string;
      
      if (!itemsByProduct.has(productId)) {
        itemsByProduct.set(productId, []);
      }
      itemsByProduct.get(productId)!.push({
        productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
      });
    }
    
    // Calculate totals
    let totalAmount = 0;

    const invoiceId = generateId();
    const invoiceItems = [];

    for (const item of items) {
      const unitResult = await db.execute({
        sql: 'SELECT * FROM ProductUnit WHERE id = ?',
        args: [item.productUnitId],
      });
      const unit = unitResult.rows[0];

      const itemTotal = item.quantity * item.purchasePrice;

      totalAmount += itemTotal;

      invoiceItems.push({
        id: generateId(),
        purchaseInvoiceId: invoiceId,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        unitType: unit.unitType,
        unitName: unit.unitName,
      });
    }

    // Create purchase invoice
    await db.execute({
      sql: `INSERT INTO PurchaseInvoice (id, userId, totalAmount, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [invoiceId, userId, totalAmount, notes || null],
    });
    
    // Create purchase invoice items
    for (const item of invoiceItems) {
      await db.execute({
        sql: `INSERT INTO PurchaseInvoiceItem (id, purchaseInvoiceId, productId, productUnitId, quantity, purchasePrice, unitType, unitName, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [item.id, item.purchaseInvoiceId, item.productId, item.productUnitId, item.quantity, item.purchasePrice, item.unitType, item.unitName],
      });
    }

    // Update stock with conversion for each product (ADD stock for purchase)
    for (const [productId, productItems] of itemsByProduct) {
      const units = await getProductUnits(productId);
      const totalPieces = convertToPieces(units);
      
      // Calculate pieces to add
      let piecesToAdd = 0;
      for (const item of productItems) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (unit) {
          piecesToAdd += item.quantity * (unit.containsPieces as number);
        }
      }
      
      // Calculate new stock (ADD instead of subtract)
      const newTotalPieces = totalPieces + piecesToAdd;
      const newStock = convertFromPieces(newTotalPieces, units);
      
      // Update all units
      await updateProductStock(productId, newStock);

      // Update product's purchase price if provided
      for (const item of productItems) {
        if (item.purchasePrice && item.purchasePrice > 0) {
          const unit = units.find(u => u.id === item.productUnitId);
          if (unit) {
            await db.execute({
              sql: `UPDATE ProductUnit SET purchasePrice = ?, updatedAt = datetime('now') WHERE id = ?`,
              args: [item.purchasePrice, item.productUnitId],
            });
          }
        }
      }
    }
    
    // Get created invoice with items
    const invoiceResult = await db.execute({
      sql: 'SELECT * FROM PurchaseInvoice WHERE id = ?',
      args: [invoiceId],
    });
    
    const itemsResult = await db.execute({
      sql: `SELECT pii.*, p.name as productName FROM PurchaseInvoiceItem pii
            LEFT JOIN Product p ON pii.productId = p.id
            WHERE pii.purchaseInvoiceId = ?`,
      args: [invoiceId],
    });
    
    return NextResponse.json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Create purchase invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE all purchase invoices (danger zone)
export async function DELETE() {
  try {
    // Get all invoice items first to deduct stock
    const itemsResult = await db.execute({
      sql: `SELECT pii.* FROM PurchaseInvoiceItem pii
            INNER JOIN PurchaseInvoice pi ON pii.purchaseInvoiceId = pi.id`,
    });

    // Group items by product
    const itemsByProduct = new Map<string, { productUnitId: string; quantity: number }[]>();
    
    for (const item of itemsResult.rows) {
      const productId = item.productId as string;
      if (!itemsByProduct.has(productId)) {
        itemsByProduct.set(productId, []);
      }
      itemsByProduct.get(productId)!.push({
        productUnitId: item.productUnitId as string,
        quantity: item.quantity as number,
      });
    }

    // Deduct stock for each product (reverse of purchase)
    for (const [productId, items] of itemsByProduct) {
      const units = await getProductUnits(productId);
      const totalPieces = convertToPieces(units);
      
      // Calculate pieces to deduct
      let piecesToDeduct = 0;
      for (const item of items) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (unit) {
          piecesToDeduct += item.quantity * (unit.containsPieces as number);
        }
      }
      
      // Calculate new stock (deduct instead of add)
      const newTotalPieces = Math.max(0, totalPieces - piecesToDeduct);
      const newStock = convertFromPieces(newTotalPieces, units);
      
      // Update all units
      await updateProductStock(productId, newStock);
    }

    // Delete all invoice items
    await db.execute({
      sql: `DELETE FROM PurchaseInvoiceItem`,
    });

    // Delete all invoices
    await db.execute({
      sql: `DELETE FROM PurchaseInvoice`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف جميع فواتير المشتريات' });
  } catch (error) {
    console.error('Delete purchase invoices error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
