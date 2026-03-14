import { createClient, type Client } from '@libsql/client';

// =============================================
// إعدادات قاعدة البيانات السحابية (Turso)
// =============================================
// بيانات الاتصال مضمنة مباشرة في المشروع

const TURSO_DATABASE_URL = "libsql://sales-db-amjad-228.aws-ap-northeast-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI4NDE5MTUsImlkIjoiMDE5Y2M1OTYtZGUwMS03NGJmLThmMzYtOWM0YmFhYzYwODc0IiwicmlkIjoiMzE5MGQzMmMtNzVmMC00YTUyLTljZmYtYWUyYzFlZTQzMmFjIn0.blUbKTL6Z7k0rf84YozkwJWJV0-oKPS09ZQ2UK63mWfcVeI_oa7q1FSlsBWkAUbbDNlUySicYBYlD1PEYyDYDw";

// إنشاء عميل قاعدة البيانات السحابية
let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    console.log('🔗 الاتصال بقاعدة البيانات السحابية:', TURSO_DATABASE_URL);
    _db = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

// تصدير عميل قاعدة البيانات
export const db = getDb();

// =============================================
// دوال مساعدة
// =============================================

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

export function getCurrentDate(): string {
  return new Date().toISOString();
}
