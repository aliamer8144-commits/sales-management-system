import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET all users
export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT id, email, name, role, createdAt FROM User ORDER BY createdAt DESC`,
      args: [],
    });
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    
    // Check if user exists
    const existingResult = await db.execute({
      sql: 'SELECT id FROM User WHERE email = ?',
      args: [email],
    });
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();
    
    await db.execute({
      sql: `INSERT INTO User (id, email, password, name, role, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [id, email, hashedPassword, name, role || 'user'],
    });
    
    const result = await db.execute({
      sql: 'SELECT id, email, name, role, createdAt FROM User WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
