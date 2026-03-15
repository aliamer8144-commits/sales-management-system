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

/**
 * Get current date and time in Yemen timezone (UTC+3)
 * Returns format compatible with SQLite: YYYY-MM-DD HH:MM:SS
 */
export function getCurrentDate(): string {
  const now = new Date();
  
  // Convert to Yemen time (UTC+3)
  // getTimezoneOffset returns minutes difference from UTC (negative for ahead of UTC)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const yemenTime = new Date(utcTime + (3 * 3600000)); // +3 hours for Yemen
  
  const year = yemenTime.getFullYear();
  const month = String(yemenTime.getMonth() + 1).padStart(2, '0');
  const day = String(yemenTime.getDate()).padStart(2, '0');
  const hours = String(yemenTime.getHours()).padStart(2, '0');
  const minutes = String(yemenTime.getMinutes()).padStart(2, '0');
  const seconds = String(yemenTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
