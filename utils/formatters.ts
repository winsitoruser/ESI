/**
 * Format a number as currency
 * @param amount - Number to format
 * @param locale - Locale to use (default: id-ID)
 * @param currency - Currency to use (default: IDR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, locale = 'id-ID', currency = 'IDR'): string {
  if (amount === undefined || amount === null) return 'Rp0';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a date as string
 * @param date - Date to format
 * @param format - Format to use (default: 'local-date')
 * @param locale - Locale to use (default: id-ID)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string, 
  format: 'local-date' | 'local-datetime' | 'iso' | 'readable' = 'local-date',
  locale = 'id-ID'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'iso':
      return dateObj.toISOString();
    
    case 'local-datetime':
      return dateObj.toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    
    case 'readable':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    
    case 'local-date':
    default:
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  }
}

/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago")
 * @param timestamp - Date or timestamp string to format
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date | string): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) {
    return 'Just now';
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  }
  
  // For older dates, just return the formatted date
  return formatDate(date, 'readable');
}
