/**
 * Input Validation Utilities untuk Admin API
 * Comprehensive validation untuk ensure data integrity
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
 * Validate module code format
 */
export function isValidModuleCode(code: string): boolean {
  const codeRegex = /^[a-z0-9_-]{2,50}$/;
  return codeRegex.test(code);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: any, limit: any): ValidationResult {
  const errors: string[] = [];
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('Page must be a positive integer');
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push('Limit must be between 1 and 100');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate module creation data
 */
export function validateModuleData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.code || typeof data.code !== 'string') {
    errors.push('Module code is required');
  } else if (!isValidModuleCode(data.code)) {
    errors.push('Module code must be lowercase alphanumeric with hyphens/underscores (2-50 chars)');
  }
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Module name is required');
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.push('Module name must be between 2 and 100 characters');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }
  
  if (data.route && typeof data.route !== 'string') {
    errors.push('Route must be a string');
  }
  
  if (data.parentModuleId && !isValidUUID(data.parentModuleId)) {
    errors.push('Parent module ID must be a valid UUID');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate business type data
 */
export function validateBusinessTypeData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.code || typeof data.code !== 'string') {
    errors.push('Business type code is required');
  } else if (!isValidModuleCode(data.code)) {
    errors.push('Business type code must be lowercase alphanumeric (2-50 chars)');
  }
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Business type name is required');
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.push('Business type name must be between 2 and 100 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate tenant data
 */
export function validateTenantData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Tenant name is required');
  } else if (data.name.length < 2 || data.name.length > 255) {
    errors.push('Tenant name must be between 2 and 255 characters');
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (data.businessTypeId && !isValidUUID(data.businessTypeId)) {
    errors.push('Business type ID must be a valid UUID');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate partner data
 */
export function validatePartnerData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.business_name || typeof data.business_name !== 'string') {
    errors.push('Business name is required');
  } else if (data.business_name.length < 2 || data.business_name.length > 255) {
    errors.push('Business name must be between 2 and 255 characters');
  }
  
  if (!data.owner_name || typeof data.owner_name !== 'string') {
    errors.push('Owner name is required');
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  if (!data.phone || !isValidPhone(data.phone)) {
    errors.push('Valid phone number is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential XSS characters
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: any): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return sanitizeString(query, 100);
}

/**
 * Validate sort parameters
 */
export function validateSort(sortBy: any, sortOrder: any, allowedFields: string[]): ValidationResult {
  const errors: string[] = [];
  
  if (sortBy && !allowedFields.includes(sortBy)) {
    errors.push(`Sort field must be one of: ${allowedFields.join(', ')}`);
  }
  
  if (sortOrder && !['ASC', 'DESC', 'asc', 'desc'].includes(sortOrder)) {
    errors.push('Sort order must be ASC or DESC');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: any, endDate: any): ValidationResult {
  const errors: string[] = [];
  
  if (startDate && isNaN(Date.parse(startDate))) {
    errors.push('Invalid start date format');
  }
  
  if (endDate && isNaN(Date.parse(endDate))) {
    errors.push('Invalid end date format');
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      errors.push('Start date must be before end date');
    }
    
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push('Date range must not exceed 365 days');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
