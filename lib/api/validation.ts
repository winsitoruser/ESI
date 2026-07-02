/**
 * Standard Validation Utilities
 * Ensures consistent validation across all API endpoints
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  data: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[]; errors: ValidationError[] } {
  const missingFields: string[] = [];
  const errors: ValidationError[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0 && data[field] !== false) {
      missingFields.push(field);
      errors.push({
        field,
        message: `${field} is required`
      });
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indonesian format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate date format (ISO 8601)
 */
export function isValidDate(date: string): boolean {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Format validation error message
 */
export function formatValidationError(missingFields: string[]): string {
  return `Missing required fields: ${missingFields.join(', ')}`;
}
