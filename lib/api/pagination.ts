/**
 * Standard Pagination Utilities
 * Ensures consistent pagination across all API endpoints
 */

export interface PaginationParams {
  limit: number;
  offset: number;
  page: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

/**
 * Extract and validate pagination parameters from query
 */
export function getPaginationParams(query: any): PaginationParams {
  const limit = Math.min(parseInt(query.limit as string) || 50, 100); // Max 100 items
  const offset = Math.max(parseInt(query.offset as string) || 0, 0);
  const page = Math.floor(offset / limit) + 1;
  
  return { limit, offset, page };
}

/**
 * Create pagination metadata for response
 */
export function getPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginationMeta {
  return {
    total,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Calculate offset from page number
 */
export function getOffsetFromPage(page: number, limit: number): number {
  return Math.max((page - 1) * limit, 0);
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): boolean {
  return (
    params.limit > 0 &&
    params.limit <= 100 &&
    params.offset >= 0 &&
    params.page > 0
  );
}
