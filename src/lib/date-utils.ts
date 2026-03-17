/**
 * Date utilities for Yemen timezone (UTC+3)
 * All dates in the system are stored in Yemen local time
 */

// Yemen timezone offset (UTC+3)
const YEMEN_TIMEZONE_OFFSET = 3;

/**
 * Get current time in Yemen timezone as ISO-like string
 * Used when saving dates to database
 * Format: YYYY-MM-DDTHH:mm:ss.sss
 */
export function getYemenNowString(): string {
  const now = new Date();
  
  // Convert to Yemen time (UTC+3)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
  
  const year = yemenTime.getFullYear();
  const month = String(yemenTime.getMonth() + 1).padStart(2, '0');
  const day = String(yemenTime.getDate()).padStart(2, '0');
  const hours = String(yemenTime.getHours()).padStart(2, '0');
  const minutes = String(yemenTime.getMinutes()).padStart(2, '0');
  const seconds = String(yemenTime.getSeconds()).padStart(2, '0');
  const ms = String(yemenTime.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Parse date string and return components
 * Handles both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DDTHH:MM:SS" formats
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number } | null {
  // Handle both space and T separator
  const normalized = dateStr.replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  
  if (!match) return null;
  
  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3]),
    hours: parseInt(match[4]),
    minutes: parseInt(match[5]),
    seconds: parseInt(match[6]),
  };
}

/**
 * Arabic month names
 */
const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Format a date string for display in Arabic
 * Since dates are stored in Yemen timezone, we just format them directly
 */
export function formatYemenDateTime(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date;
  } else {
    // If it's a Date object, convert to Yemen time string
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
    dateStr = `${yemenTime.getFullYear()}-${String(yemenTime.getMonth() + 1).padStart(2, '0')}-${String(yemenTime.getDate()).padStart(2, '0')} ${String(yemenTime.getHours()).padStart(2, '0')}:${String(yemenTime.getMinutes()).padStart(2, '0')}:${String(yemenTime.getSeconds()).padStart(2, '0')}`;
  }
  
  const parsed = parseDateString(dateStr);
  if (!parsed) return '';
  
  // Format in Arabic
  const monthName = arabicMonths[parsed.month - 1];
  const hours12 = parsed.hours % 12 || 12;
  const ampm = parsed.hours >= 12 ? 'م' : 'ص';
  
  return `${parsed.day} ${monthName} ${parsed.year}، ${hours12}:${String(parsed.minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Format date only (no time)
 */
export function formatYemenDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date;
  } else {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
    dateStr = `${yemenTime.getFullYear()}-${String(yemenTime.getMonth() + 1).padStart(2, '0')}-${String(yemenTime.getDate()).padStart(2, '0')}`;
  }
  
  const parsed = parseDateString(dateStr);
  if (!parsed) return '';
  
  const monthName = arabicMonths[parsed.month - 1];
  return `${parsed.day} ${monthName} ${parsed.year}`;
}

/**
 * Format time only
 */
export function formatYemenTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date;
  } else {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
    dateStr = `${String(yemenTime.getHours()).padStart(2, '0')}:${String(yemenTime.getMinutes()).padStart(2, '0')}`;
  }
  
  // Parse time from string
  const timeMatch = dateStr.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return '';
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const hours12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'م' : 'ص';
  
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Get Yemen date string for datetime-local input
 * Returns format: YYYY-MM-DDTHH:mm
 */
export function getYemenDateTimeLocal(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date;
  } else {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
    dateStr = `${yemenTime.getFullYear()}-${String(yemenTime.getMonth() + 1).padStart(2, '0')}-${String(yemenTime.getDate()).padStart(2, '0')}T${String(yemenTime.getHours()).padStart(2, '0')}:${String(yemenTime.getMinutes()).padStart(2, '0')}`;
  }
  
  const parsed = parseDateString(dateStr);
  if (!parsed) return '';
  
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}T${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`;
}

/**
 * Get Yemen date string for date input
 * Returns format: YYYY-MM-DD
 */
export function getYemenDateString(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date;
  } else {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utcTime + (YEMEN_TIMEZONE_OFFSET * 3600000));
    dateStr = `${yemenTime.getFullYear()}-${String(yemenTime.getMonth() + 1).padStart(2, '0')}-${String(yemenTime.getDate()).padStart(2, '0')}`;
  }
  
  const parsed = parseDateString(dateStr);
  if (!parsed) return '';
  
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

/**
 * Get current Yemen date for date input
 * Returns format: YYYY-MM-DD
 */
export function getCurrentYemenDate(): string {
  return getYemenDateString(getYemenNowString());
}

/**
 * Get current Yemen datetime for datetime-local input
 * Returns format: YYYY-MM-DDTHH:mm
 */
export function getCurrentYemenDateTimeLocal(): string {
  return getYemenDateTimeLocal(getYemenNowString());
}
