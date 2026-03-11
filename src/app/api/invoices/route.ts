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

// Calculate available stock in pieces and convert to display format
function calculateAvailableStock(units: ProductUnitRow[]): { cartons: number; packets: number; pieces: number; totalPieces: number } {
  const totalPieces = convertToPieces(units);
  
  const cartonUnit = units.find(u => u.unitType === 'carton');
  const packetUnit = units.find(u => u.unitType === 'packet');
  const pieceUnit = units.find(u => u.unitType === 'piece');
  
  let remaining = totalPieces;
  const cartons = cartonUnit ? Math.floor(remaining / (cartonUnit.containsPieces as number)) : 0;
  if (cartonUnit) remaining = remaining % (cartonUnit.containsPieces as number);
  
  const packets = packetUnit ? Math.floor(remaining / (packetUnit.containsPieces as number)) : 0;
  if (packetUnit) remaining = remaining % (packetUnit.containsPieces as number);
  
  const pieces = remaining;
  
  return { cartons, packets, pieces, totalPieces };
}

// =============================================
// API Routes
// =============================================

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT i.*, u.name as userName, u.email as userEmail, c.name as customerName, c.phone as customerPhone
      FROM Invoice i
      LEFT JOIN User u ON i.userId = u.id
      LEFT JOIN Customer c ON i.customerId = c.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];
    
    if (userId) {
      sql += ' AND i.userId = ?';
      args.push(userId);
    }
    
    if (customerId) {
      sql += ' AND i.customerId = ?';
      args.push(customerId);
    }
    
    if (type) {
      sql += ' AND i.invoiceType = ?';
      args.push(type);
    }
    
    if (startDate) {
      sql += ' AND date(i.createdAt) >= date(?)';
      args.push(startDate);
    }
    
    if (endDate) {
      sql += " AND date(i.createdAt) <= date(?)";
      args.push(endDate);
    }
    
    sql += ' ORDER BY i.createdAt DESC';
    
    const result = await db.execute({ sql, args });
    
    // Get items for each invoice
    const invoices = [];
    for (const row of result.rows) {
      const itemsResult = await db.execute({
        sql: `SELECT ii.*, p.name as productName 
              FROM InvoiceItem ii
              LEFT JOIN Product p ON ii.productId = p.id
              WHERE ii.invoiceId = ?`,
        args: [row.id],
      });
      
      invoices.push({
        id: row.id,
        invoiceType: row.invoiceType,
        totalAmount: row.totalAmount,
        totalProfit: row.totalProfit,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        customerId: row.customerId,
        user: {
          id: row.userId,
          name: row.userName,
          email: row.userEmail,
        },
        customer: row.customerId ? {
          id: row.customerId,
          name: row.customerName,
          phone: row.customerPhone,
        } : null,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
          purchasePrice: item.purchasePrice,
          unitType: item.unitType,
          unitName: item.unitName,
          productUnitId: item.productUnitId,
        })),
      });
    }
    
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, customerId, invoiceType, notes, items } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'أضف منتج واحد على الأقل' }, { status: 400 });
    }

    // Group items by product for stock conversion
    const itemsByProduct = new Map<string, { productId: string; productUnitId: string; quantity: number; salePrice: number }[]>();
    
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
        salePrice: item.salePrice,
      });
    }

    // Validate stock and calculate pieces needed for each product
    for (const [productId, productItems] of itemsByProduct) {
      const units = await getProductUnits(productId);
      const totalAvailablePieces = convertToPieces(units);
      
      // Calculate total pieces needed for this product
      let piecesNeeded = 0;
      for (const item of productItems) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (!unit) {
          return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 400 });
        }
        piecesNeeded += item.quantity * (unit.containsPieces as number);
      }
      
      if (piecesNeeded > totalAvailablePieces) {
        // Get product name
        const productResult = await db.execute({
          sql: 'SELECT name FROM Product WHERE id = ?',
          args: [productId],
        });
        const productName = productResult.rows[0]?.name || 'منتج غير معروف';
        
        const stock = calculateAvailableStock(units);
        return NextResponse.json({ 
          error: `الكمية المتوفرة من "${productName}" هي ${stock.cartons} كرتون، ${stock.packets} باكت، ${stock.pieces} قطعة فقط` 
        }, { status: 400 });
      }
    }
    
    // Calculate totals
    let totalAmount = 0;
    let totalProfit = 0;

    const invoiceId = generateId();
    const invoiceItems = [];

    for (const item of items) {
      const unitResult = await db.execute({
        sql: 'SELECT * FROM ProductUnit WHERE id = ?',
        args: [item.productUnitId],
      });
      const unit = unitResult.rows[0];

      const itemTotal = item.quantity * item.salePrice;
      const itemProfit = item.quantity * (item.salePrice - (unit.purchasePrice as number));

      totalAmount += itemTotal;
      totalProfit += itemProfit;

      invoiceItems.push({
        id: generateId(),
        invoiceId,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        purchasePrice: unit.purchasePrice,
        unitType: unit.unitType,
        unitName: unit.unitName,
      });
    }

    // Create invoice
    await db.execute({
      sql: `INSERT INTO Invoice (id, userId, customerId, invoiceType, totalAmount, totalProfit, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [invoiceId, userId, invoiceType === 'credit' ? customerId : null, invoiceType || 'cash', totalAmount, totalProfit, notes || null],
    });
    
    // Create invoice items
    for (const item of invoiceItems) {
      await db.execute({
        sql: `INSERT INTO InvoiceItem (id, invoiceId, productId, productUnitId, quantity, salePrice, purchasePrice, unitType, unitName, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [item.id, item.invoiceId, item.productId, item.productUnitId, item.quantity, item.salePrice, item.purchasePrice, item.unitType, item.unitName],
      });
    }

    // Update stock with conversion for each product
    for (const [productId, productItems] of itemsByProduct) {
      const units = await getProductUnits(productId);
      const totalPieces = convertToPieces(units);
      
      // Calculate pieces to deduct
      let piecesToDeduct = 0;
      for (const item of productItems) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (unit) {
          piecesToDeduct += item.quantity * (unit.containsPieces as number);
        }
      }
      
      // Calculate new stock
      const newTotalPieces = totalPieces - piecesToDeduct;
      const newStock = convertFromPieces(newTotalPieces, units);
      
      // Update all units
      await updateProductStock(productId, newStock);
    }
    
    // Get created invoice with items
    const invoiceResult = await db.execute({
      sql: 'SELECT * FROM Invoice WHERE id = ?',
      args: [invoiceId],
    });
    
    const itemsResult = await db.execute({
      sql: `SELECT ii.*, p.name as productName FROM InvoiceItem ii
            LEFT JOIN Product p ON ii.productId = p.id
            WHERE ii.invoiceId = ?`,
      args: [invoiceId],
    });
    
    return NextResponse.json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
