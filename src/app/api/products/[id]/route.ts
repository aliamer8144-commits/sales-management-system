import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { convertToProperUnits } from '@/lib/unit-conversion';

// GET single product with units
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const productResult = await db.execute({
      sql: 'SELECT * FROM Product WHERE id = ?',
      args: [id],
    });
    
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }
    
    const unitsResult = await db.execute({
      sql: `SELECT * FROM ProductUnit WHERE productId = ? ORDER BY 
            CASE unitType 
              WHEN 'carton' THEN 1 
              WHEN 'packet' THEN 2 
              WHEN 'piece' THEN 3 
              ELSE 4 
            END`,
      args: [id],
    });
    
    return NextResponse.json({
      id: productResult.rows[0].id,
      name: productResult.rows[0].name,
      alertLimit: productResult.rows[0].alertLimit,
      alertUnitType: (productResult.rows[0] as Record<string, unknown>).alertUnitType || 'piece',
      notes: productResult.rows[0].notes,
      units: unitsResult.rows,
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, notes, alertLimit, alertUnitType, units } = body;
    
    // Check product exists
    const existingProduct = await db.execute({
      sql: 'SELECT id FROM Product WHERE id = ?',
      args: [id],
    });
    
    if (existingProduct.rows.length === 0) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }
    
    // Get conversion values from units
    const cartonUnit = units.find((u: { unitType: string }) => u.unitType === 'carton');
    const packetUnit = units.find((u: { unitType: string }) => u.unitType === 'packet');
    const pieceUnit = units.find((u: { unitType: string }) => u.unitType === 'piece');
    
    const piecesPerPacket = packetUnit?.containsPieces || 0;
    const packetsPerCarton = cartonUnit && packetUnit 
      ? Math.floor(cartonUnit.containsPieces / packetUnit.containsPieces) 
      : 0;
    
    // Get stock values
    const cartonStock = cartonUnit?.stockQuantity || 0;
    const packetStock = packetUnit?.stockQuantity || 0;
    const pieceStock = pieceUnit?.stockQuantity || 0;
    
    // Convert to proper units
    const convertedStock = convertToProperUnits(
      cartonStock,
      packetStock,
      pieceStock,
      piecesPerPacket,
      packetsPerCarton
    );
    
    // Update units with converted stock
    const processedUnits = units.map((unit: { unitType: string; stockQuantity?: number }) => {
      if (unit.unitType === 'carton') {
        return { ...unit, stockQuantity: convertedStock.cartonStock };
      } else if (unit.unitType === 'packet') {
        return { ...unit, stockQuantity: convertedStock.packetStock };
      } else {
        return { ...unit, stockQuantity: convertedStock.pieceStock };
      }
    });
    
    // Check if alertUnitType column exists
    let hasAlertUnitTypeColumn = true;
    try {
      const tableInfo = await db.execute({
        sql: "PRAGMA table_info(Product)",
        args: [],
      });
      const columns = tableInfo.rows.map((row) => (row as Record<string, unknown>).name);
      hasAlertUnitTypeColumn = columns.includes('alertUnitType');
    } catch {
      hasAlertUnitTypeColumn = false;
    }
    
    // Update product
    if (hasAlertUnitTypeColumn) {
      await db.execute({
        sql: `UPDATE Product SET name = ?, alertLimit = ?, alertUnitType = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`,
        args: [name, alertLimit || 5, alertUnitType || 'piece', notes || null, id],
      });
    } else {
      await db.execute({
        sql: `UPDATE Product SET name = ?, alertLimit = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`,
        args: [name, alertLimit || 5, notes || null, id],
      });
    }
    
    // Get existing units
    const existingUnits = await db.execute({
      sql: 'SELECT id FROM ProductUnit WHERE productId = ?',
      args: [id],
    });
    
    // Delete units not in the new list
    const newUnitIds = processedUnits.filter((u: { id?: string }) => u.id).map((u: { id?: string }) => u.id);
    for (const existingUnit of existingUnits.rows) {
      if (!newUnitIds.includes(existingUnit.id)) {
        await db.execute({
          sql: 'DELETE FROM ProductUnit WHERE id = ?',
          args: [existingUnit.id],
        });
      }
    }
    
    // Update or create units with converted stock
    for (const unit of processedUnits) {
      if (unit.id) {
        // Update existing unit
        await db.execute({
          sql: `UPDATE ProductUnit SET unitType = ?, unitName = ?, purchasePrice = ?, containsPieces = ?, stockQuantity = ?, updatedAt = datetime('now') WHERE id = ?`,
          args: [unit.unitType, unit.unitName, unit.purchasePrice, unit.containsPieces, unit.stockQuantity || 0, unit.id],
        });
      } else {
        // Create new unit
        const unitId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        await db.execute({
          sql: `INSERT INTO ProductUnit (id, productId, unitType, unitName, purchasePrice, containsPieces, stockQuantity, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          args: [unitId, id, unit.unitType, unit.unitName, unit.purchasePrice, unit.containsPieces, unit.stockQuantity || 0],
        });
      }
    }
    
    // Get updated product
    const productResult = await db.execute({
      sql: 'SELECT * FROM Product WHERE id = ?',
      args: [id],
    });
    
    const unitsResult = await db.execute({
      sql: 'SELECT * FROM ProductUnit WHERE productId = ?',
      args: [id],
    });
    
    return NextResponse.json({
      id: productResult.rows[0].id,
      name: productResult.rows[0].name,
      alertLimit: productResult.rows[0].alertLimit,
      alertUnitType: (productResult.rows[0] as Record<string, unknown>).alertUnitType || 'piece',
      notes: productResult.rows[0].notes,
      units: unitsResult.rows,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'حدث خطأ', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if product has invoices
    const invoicesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM InvoiceItem WHERE productId = ?',
      args: [id],
    });
    
    if ((invoicesResult.rows[0] as { count: number }).count > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف المنتج لوجود فواتير مرتبطة به' }, { status: 400 });
    }
    
    // Delete units first
    await db.execute({
      sql: 'DELETE FROM ProductUnit WHERE productId = ?',
      args: [id],
    });
    
    // Delete product
    await db.execute({
      sql: 'DELETE FROM Product WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
