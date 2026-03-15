import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDate } from '@/lib/db';
import { convertToProperUnits } from '@/lib/unit-conversion';

// GET all products with units
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    // Get all products
    const productsResult = await db.execute({
      sql: `SELECT * FROM Product WHERE name LIKE ? ORDER BY createdAt DESC`,
      args: [`%${search}%`],
    });
    
    // Get units for each product
    const products = [];
    for (const product of productsResult.rows) {
      const unitsResult = await db.execute({
        sql: `SELECT * FROM ProductUnit WHERE productId = ? ORDER BY 
              CASE unitType 
                WHEN 'carton' THEN 1 
                WHEN 'packet' THEN 2 
                WHEN 'piece' THEN 3 
                ELSE 4 
              END`,
        args: [product.id],
      });
      
      products.push({
        id: product.id,
        name: product.name,
        alertLimit: product.alertLimit,
        alertUnitType: (product as Record<string, unknown>).alertUnitType || 'piece',
        notes: product.notes,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        units: unitsResult.rows.map(unit => ({
          id: unit.id,
          unitType: unit.unitType,
          unitName: unit.unitName,
          purchasePrice: unit.purchasePrice,
          containsPieces: unit.containsPieces,
          stockQuantity: unit.stockQuantity,
        })),
      });
    }
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new product with units
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, notes, alertLimit, alertUnitType, units } = body;
    
    if (!name || !units || units.length === 0) {
      return NextResponse.json({ error: 'البيانات غير كاملة' }, { status: 400 });
    }
    
    const productId = generateId();
    
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
    
    // Create product
    if (hasAlertUnitTypeColumn) {
      await db.execute({
        sql: `INSERT INTO Product (id, name, alertLimit, alertUnitType, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [productId, name, alertLimit || 5, alertUnitType || 'piece', notes || null, getCurrentDate(), getCurrentDate()],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO Product (id, name, alertLimit, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [productId, name, alertLimit || 5, notes || null, getCurrentDate(), getCurrentDate()],
      });
    }
    
    // Create units with converted stock
    for (const unit of processedUnits) {
      const unitId = generateId();
      await db.execute({
        sql: `INSERT INTO ProductUnit (id, productId, unitType, unitName, purchasePrice, containsPieces, stockQuantity, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          unitId,
          productId,
          unit.unitType,
          unit.unitName,
          unit.purchasePrice,
          unit.containsPieces,
          unit.stockQuantity || 0,
          getCurrentDate(),
          getCurrentDate(),
        ],
      });
    }
    
    // Get created product with units
    const productResult = await db.execute({
      sql: 'SELECT * FROM Product WHERE id = ?',
      args: [productId],
    });
    
    const unitsResult = await db.execute({
      sql: 'SELECT * FROM ProductUnit WHERE productId = ?',
      args: [productId],
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
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'حدث خطأ', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
