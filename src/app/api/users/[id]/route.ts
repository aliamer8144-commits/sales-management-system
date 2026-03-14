import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: 'SELECT id, email, name, role, createdAt FROM User WHERE id = ?',
      args: [id],
    });
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password } = body;
    
    // Check if user exists
    const existingResult = await db.execute({
      sql: 'SELECT * FROM User WHERE id = ?',
      args: [id],
    });
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    
    // Check if email is taken by another user
    if (email) {
      const emailCheck = await db.execute({
        sql: 'SELECT id FROM User WHERE email = ? AND id != ?',
        args: [email, id],
      });
      
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 });
      }
    }
    
    // Build update query
    const updates: string[] = [];
    const args: (string | number)[] = [];
    
    if (name) {
      updates.push('name = ?');
      args.push(name);
    }
    
    if (email) {
      updates.push('email = ?');
      args.push(email);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      args.push(hashedPassword);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
    }
    
    updates.push("updatedAt = datetime('now')");
    args.push(id);
    
    await db.execute({
      sql: `UPDATE User SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
    
    const result = await db.execute({
      sql: 'SELECT id, email, name, role, createdAt FROM User WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user exists
    const existingResult = await db.execute({
      sql: 'SELECT * FROM User WHERE id = ?',
      args: [id],
    });
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }
    
    await db.execute({
      sql: 'DELETE FROM User WHERE id = ?',
      args: [id],
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
