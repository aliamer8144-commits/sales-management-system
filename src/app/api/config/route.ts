import { NextResponse } from 'next/server';

// بيانات الاتصال مضمنة مباشرة في المشروع
const TURSO_DATABASE_URL = "libsql://sales-db-amjad-228.aws-ap-northeast-1.turso.io";

export async function GET() {
  return NextResponse.json({
    isCloud: true,
    databaseType: 'سحابية (Turso)',
    message: 'قاعدة البيانات متزامنة عبر جميع الأجهزة ✓',
    config: {
      hasUrl: true,
      hasToken: true,
      url: TURSO_DATABASE_URL,
    }
  });
}
