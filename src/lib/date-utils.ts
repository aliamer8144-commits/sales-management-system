/**
 * Date utilities for Yemen timezone (UTC+3)
 * All dates in the system are stored and displayed in Yemen local time
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
 * Format a Yemen time string for display
 * Dates are stored in Yemen timezone (UTC+3), but when JavaScript parses them
 * it interprets them as local timezone. We need to convert back to Yemen time.
 */
export function formatYemenDateTime(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  
  // Parse the date
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  // The date is stored in Yemen timezone (UTC+3)
  // When JS parses it, it treats it as local time
  // We need to convert it back to Yemen time
  
  // Get what JS thinks is the "local" time components
  // Then adjust by the timezone difference
  const localOffset = d.getTimezoneOffset(); // minutes from UTC (negative if ahead)
  const yemenOffset = -180; // Yemen is UTC+3, so -180 minutes from UTC
  
  // Difference in minutes between local timezone and Yemen
  const diffMinutes = localOffset - yemenOffset;
  
  // Create a new date adjusted to Yemen time
  const yemenDate = new Date(d.getTime() + (diffMinutes * 60000));
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  // Format using the adjusted date's components
  // We use 'en-CA' for YYYY-MM-DD format style, then format with Arabic
  return new Intl.DateTimeFormat('ar-SA', {
    ...defaultOptions,
    timeZone: 'UTC' // Use UTC to prevent further timezone conversion
  }).format(yemenDate);
}

/**
 * Format date only
 */
export function formatYemenDate(date: string | Date | null | undefined): string {
  return formatYemenDateTime(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time only
 */
export function formatYemenTime(date: string | Date | null | undefined): string {
  return formatYemenDateTime(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get Yemen date string for datetime-local input
 * Returns format: YYYY-MM-DDTHH:mm
 */
export function getYemenDateTimeLocal(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  // Convert to Yemen timezone
  const localOffset = d.getTimezoneOffset();
  const yemenOffset = -180; // UTC+3
  const diffMinutes = localOffset - yemenOffset;
  const yemenDate = new Date(d.getTime() + (diffMinutes * 60000));
  
  const year = yemenDate.getUTCFullYear();
  const month = String(yemenDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yemenDate.getUTCDate()).padStart(2, '0');
  const hours = String(yemenDate.getUTCHours()).padStart(2, '0');
  const minutes = String(yemenDate.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get Yemen date string for date input
 * Returns format: YYYY-MM-DD
 */
export function getYemenDateString(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  // Convert to Yemen timezone
  const localOffset = d.getTimezoneOffset();
  const yemenOffset = -180; // UTC+3
  const diffMinutes = localOffset - yemenOffset;
  const yemenDate = new Date(d.getTime() + (diffMinutes * 60000));
  
  const year = yemenDate.getUTCFullYear();
  const month = String(yemenDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yemenDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
