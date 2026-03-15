import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const userCookie = request.cookies.get('auth-user');
    
    if (!userCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    const user = JSON.parse(userCookie.value);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
