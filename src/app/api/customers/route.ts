import { NextRequest, NextResponse } from 'next/server';
import { db, generateId } from '@/lib/db';

import type { Customer } from '@/types';

interface CustomerWithStats extends Customer {
  totalDebt: number;
  totalPaid: number;
  balance: number;
  lastInvoiceDate?: string;
  invoiceCount: number;
  lastTransaction?: {
    type: 'invoice' | 'payment';
    date: string;
    amount: number;
  };
}

// GET all customers with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    // Get all customers
    const customersResult = await db.execute({
      sql: `SELECT * FROM Customer ORDER BY name`,
      args: [],
    });
    
    // Calculate stats for each customer
    const customers: CustomerWithStats[] = [];
    
    for (const row of customersResult.rows) {
      const customer = row as Customer & { createdAt: string };
      
      // Get total debt from credit and manual invoices
      const debtResult = await db.execute({
        sql: `SELECT COALESCE(SUM(totalAmount), 0) as totalDebt 
              FROM Invoice 
              WHERE customerId = ? AND (invoiceType = 'credit' OR invoiceType = 'manual')`,
        args: [customer.id],
      });
      
      // Get total paid
      const paidResult = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as totalPaid 
              FROM Payment 
              WHERE customerId = ?`,
        args: [customer.id],
      });
      
      // Get last invoice date and amount
      const lastInvoiceResult = await db.execute({
        sql: `SELECT createdAt, totalAmount FROM Invoice 
              WHERE customerId = ? 
              ORDER BY createdAt DESC LIMIT 1`,
        args: [customer.id],
      });
      
      // Get last payment date and amount
      const lastPaymentResult = await db.execute({
        sql: `SELECT createdAt, amount FROM Payment 
              WHERE customerId = ? 
              ORDER BY createdAt DESC LIMIT 1`,
        args: [customer.id],
      });
      
      // Get invoice count
      const invoiceCountResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Invoice WHERE customerId = ?`,
        args: [customer.id],
      });
      
      const totalDebt = (debtResult.rows[0] as { totalDebt: number }).totalDebt;
      const totalPaid = (paidResult.rows[0] as { totalPaid: number }).totalPaid;
      const lastInvoiceDate = lastInvoiceResult.rows[0]?.createdAt as string | undefined;
      const invoiceCount = (invoiceCountResult.rows[0] as { count: number }).count;
      
      // Determine the last transaction (invoice or payment)
      let lastTransaction: CustomerWithStats['lastTransaction'] = undefined;
      const lastInvoice = lastInvoiceResult.rows[0] as { createdAt: string; totalAmount: number } | undefined;
      const lastPayment = lastPaymentResult.rows[0] as { createdAt: string; amount: number } | undefined;
      
      if (lastInvoice && lastPayment) {
        // Compare dates to determine which is more recent
        const invoiceDate = new Date(lastInvoice.createdAt);
        const paymentDate = new Date(lastPayment.createdAt);
        
        if (paymentDate > invoiceDate) {
          lastTransaction = {
            type: 'payment',
            date: lastPayment.createdAt,
            amount: lastPayment.amount,
          };
        } else {
          lastTransaction = {
            type: 'invoice',
            date: lastInvoice.createdAt,
            amount: lastInvoice.totalAmount,
          };
        }
      } else if (lastInvoice) {
        lastTransaction = {
          type: 'invoice',
          date: lastInvoice.createdAt,
          amount: lastInvoice.totalAmount,
        };
      } else if (lastPayment) {
        lastTransaction = {
          type: 'payment',
          date: lastPayment.createdAt,
          amount: lastPayment.amount,
        };
      }
      
      // Filter by search if provided
      if (search && !customer.name.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }
      
      customers.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        notes: customer.notes,
        totalDebt,
        totalPaid,
        balance: totalDebt - totalPaid,
        lastInvoiceDate,
        invoiceCount,
        lastTransaction,
      });
    }
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, notes } = body;
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'اسم العميل مطلوب' }, { status: 400 });
    }
    
    const customerId = generateId();
    
    await db.execute({
      sql: `INSERT INTO Customer (id, name, phone, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [customerId, name.trim(), phone || null, notes || null],
    });
    
    return NextResponse.json({ 
      id: customerId,
      name: name.trim(),
      phone: phone || null,
      notes: notes || null,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
