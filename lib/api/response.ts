/**
 * Standard API Response Utilities
 * Ensures consistent response format across all API endpoints
 */

export interface ApiSuccessResponse<T = any> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationMeta {
  total?: number;
  limit?: number;
  offset?: number;
  page?: number;
  totalPages?: number;
  pagination?: {
    total: number;
    limit: number;
    offset?: number;
    page: number;
    totalPages: number;
  };
  [key: string]: any; // Allow additional metadata like stats
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<PaginationMeta>,
  message?: string
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = { data };
  
  if (meta) {
    response.meta = meta as PaginationMeta;
  }
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details })
    }
  };
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  MODEL_NOT_AVAILABLE: 'MODEL_NOT_AVAILABLE'
} as const;

/**
 * HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;
