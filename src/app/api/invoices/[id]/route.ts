import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDate } from '@/lib/db';

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

// Convert all stock to pieces for calculations
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
      sql: `UPDATE ProductUnit SET stockQuantity = ?, updatedAt = ? WHERE id = ?`,
      args: [quantity, getCurrentDate(), unitId],
    });
  }
}

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
      customerId: invoice.customerId,
      customer: invoice.customerId ? {
        id: invoice.customerId,
        name: invoice.customerName,
      } : null,
      user: {
        name: invoice.userName,
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        productId: item.productId,
        productUnitId: item.productUnitId,
        productName: item.productName,
        quantity: item.quantity,
        unitName: item.unitName,
        unitType: item.unitType,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
      })),
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT - Update/Edit invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { customerId, invoiceType, notes, items } = body;

    // Verify invoice exists
    const invoiceResult = await db.execute({
      sql: 'SELECT * FROM Invoice WHERE id = ?',
      args: [id],
    });

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    // Get old invoice items to restore stock
    const oldItemsResult = await db.execute({
      sql: 'SELECT * FROM InvoiceItem WHERE invoiceId = ?',
      args: [id],
    });

    // Group old items by product for stock restoration
    const oldItemsByProduct = new Map<string, { productUnitId: string; quantity: number; piecesPerUnit: number }[]>();
    
    for (const item of oldItemsResult.rows) {
      // Get unit info to know pieces per unit
      const unitResult = await db.execute({
        sql: 'SELECT productId, containsPieces FROM ProductUnit WHERE id = ?',
        args: [item.productUnitId],
      });
      
      if (unitResult.rows.length > 0) {
        const productId = unitResult.rows[0].productId as string;
        const piecesPerUnit = unitResult.rows[0].containsPieces as number;
        
        if (!oldItemsByProduct.has(productId)) {
          oldItemsByProduct.set(productId, []);
        }
        oldItemsByProduct.get(productId)!.push({
          productUnitId: item.productUnitId as string,
          quantity: item.quantity as number,
          piecesPerUnit,
        });
      }
    }

    // Restore stock for old items (add back to inventory)
    for (const [productId, oldItems] of oldItemsByProduct) {
      const units = await getProductUnits(productId);
      const totalPieces = convertToPieces(units);
      
      // Calculate pieces to restore
      let piecesToRestore = 0;
      for (const item of oldItems) {
        piecesToRestore += item.quantity * item.piecesPerUnit;
      }
      
      // Calculate new stock
      const newTotalPieces = totalPieces + piecesToRestore;
      const newStock = convertFromPieces(newTotalPieces, units);
      
      await updateProductStock(productId, newStock);
    }

    // Delete old invoice items
    await db.execute({
      sql: 'DELETE FROM InvoiceItem WHERE invoiceId = ?',
      args: [id],
    });

    // Now validate and create new items
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'أضف منتج واحد على الأقل' }, { status: 400 });
    }

    // Group new items by product for stock validation
    const newItemsByProduct = new Map<string, { productId: string; productUnitId: string; quantity: number; salePrice: number }[]>();
    
    for (const item of items) {
      const unitResult = await db.execute({
        sql: 'SELECT productId FROM ProductUnit WHERE id = ?',
        args: [item.productUnitId],
      });
      
      if (unitResult.rows.length === 0) {
        return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 400 });
      }
      
      const productId = unitResult.rows[0].productId as string;
      
      if (!newItemsByProduct.has(productId)) {
        newItemsByProduct.set(productId, []);
      }
      newItemsByProduct.get(productId)!.push({
        productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        salePrice: item.salePrice,
      });
    }

    // Validate stock for new items
    for (const [productId, productItems] of newItemsByProduct) {
      const units = await getProductUnits(productId);
      const totalAvailablePieces = convertToPieces(units);
      
      let piecesNeeded = 0;
      for (const item of productItems) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (!unit) {
          return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 400 });
        }
        piecesNeeded += item.quantity * (unit.containsPieces as number);
      }
      
      if (piecesNeeded > totalAvailablePieces) {
        return NextResponse.json({ 
          error: `الكمية المتوفرة غير كافية` 
        }, { status: 400 });
      }
    }

    // Calculate new totals and create items
    let totalAmount = 0;
    let totalProfit = 0;
    const newInvoiceItems = [];

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

      newInvoiceItems.push({
        id: generateId(),
        invoiceId: id,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        purchasePrice: unit.purchasePrice,
        unitType: unit.unitType,
        unitName: unit.unitName,
      });
    }

    // Create new invoice items
    for (const item of newInvoiceItems) {
      await db.execute({
        sql: `INSERT INTO InvoiceItem (id, invoiceId, productId, productUnitId, quantity, salePrice, purchasePrice, unitType, unitName, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [item.id, item.invoiceId, item.productId, item.productUnitId, item.quantity, item.salePrice, item.purchasePrice, item.unitType, item.unitName, getCurrentDate()],
      });
    }

    // Update stock for new items (deduct from inventory)
    for (const [productId, productItems] of newItemsByProduct) {
      const units = await getProductUnits(productId);
      const totalPieces = convertToPieces(units);
      
      let piecesToDeduct = 0;
      for (const item of productItems) {
        const unit = units.find(u => u.id === item.productUnitId);
        if (unit) {
          piecesToDeduct += item.quantity * (unit.containsPieces as number);
        }
      }
      
      const newTotalPieces = totalPieces - piecesToDeduct;
      const newStock = convertFromPieces(newTotalPieces, units);
      
      await updateProductStock(productId, newStock);
    }

    // Update invoice record
    await db.execute({
      sql: `UPDATE Invoice SET 
              customerId = ?, 
              invoiceType = ?, 
              totalAmount = ?, 
              totalProfit = ?, 
              notes = ?, 
              updatedAt = ?
            WHERE id = ?`,
      args: [
        invoiceType === 'credit' ? customerId : null,
        invoiceType || 'cash',
        totalAmount,
        totalProfit,
        notes || null,
        getCurrentDate(),
        id,
      ],
    });

    // Get updated invoice with items
    const updatedInvoiceResult = await db.execute({
      sql: `
        SELECT i.*, c.name as customerName, u.name as userName
        FROM Invoice i
        LEFT JOIN Customer c ON i.customerId = c.id
        LEFT JOIN User u ON i.userId = u.id
        WHERE i.id = ?
      `,
      args: [id],
    });
    
    const updatedItemsResult = await db.execute({
      sql: `SELECT ii.*, p.name as productName FROM InvoiceItem ii
            LEFT JOIN Product p ON ii.productId = p.id
            WHERE ii.invoiceId = ?`,
      args: [id],
    });
    
    return NextResponse.json({
      ...updatedInvoiceResult.rows[0],
      items: updatedItemsResult.rows,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
