/**
 * Utility functions for formatting data in the application
 */

/**
 * Format a number as Indonesian Rupiah
 * @param value Number to format
 * @returns Formatted Rupiah string
 */
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format a number as currency (alias for formatRupiah)
 * @param value Number to format
 * @returns Formatted currency string
 */
export const formatCurrency = formatRupiah;
