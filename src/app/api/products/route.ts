import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';

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
    const { name, notes, alertLimit, units } = body;
    
    if (!name || !units || units.length === 0) {
      return NextResponse.json({ error: 'البيانات غير كاملة' }, { status: 400 });
    }
    
    const productId = generateId();
    
    // Create product
    await db.execute({
      sql: `INSERT INTO Product (id, name, alertLimit, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [productId, name, alertLimit || 5, notes || null],
    });
    
    // Create units
    for (const unit of units) {
      const unitId = generateId();
      await db.execute({
        sql: `INSERT INTO ProductUnit (id, productId, unitType, unitName, purchasePrice, containsPieces, stockQuantity, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          unitId,
          productId,
          unit.unitType,
          unit.unitName,
          unit.purchasePrice,
          unit.containsPieces,
          unit.stockQuantity || 0,
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
      notes: productResult.rows[0].notes,
      units: unitsResult.rows,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
