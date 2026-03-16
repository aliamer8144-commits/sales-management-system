import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create a share token for customer statement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, startDate, endDate } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'معرف العميل مطلوب' }, { status: 400 });
    }

    // Verify customer exists
    const customerResult = await db.execute({
      sql: 'SELECT id, name FROM Customer WHERE id = ?',
      args: [customerId],
    });

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    // Create token data - store dates directly without timezone conversion
    // Handle both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:mm) formats
    let startDateValue: string | null = null;
    let endDateValue: string | null = null;
    
    if (startDate) {
      // If already contains 'T', it's a datetime value from datetime-local
      if (startDate.includes('T')) {
        startDateValue = startDate + ':00'; // Add seconds
      } else {
        startDateValue = startDate + 'T00:00:00'; // Start of day
      }
    }
    
    if (endDate) {
      // If already contains 'T', it's a datetime value from datetime-local
      if (endDate.includes('T')) {
        endDateValue = endDate + ':59'; // End to the minute
      } else {
        endDateValue = endDate + 'T23:59:59'; // End of day
      }
    }
    
    const tokenData = {
      customerId,
      startDate: startDateValue,
      endDate: endDateValue,
      createdAt: new Date().toISOString(),
    };

    // Encode token (base64)
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

    // Build share URL
    const shareUrl = `/share/${token}`;

    return NextResponse.json({
      success: true,
      token,
      shareUrl,
    });
  } catch (error) {
    console.error('Create share token error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
