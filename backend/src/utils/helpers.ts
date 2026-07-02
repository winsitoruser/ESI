import { Response } from 'express';
import { ApiResponse, PaginationQuery } from '../types';

export function sendSuccess<T>(res: Response, data?: T, message?: string, statusCode = 200): void {
  const response: ApiResponse<T> = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  res.status(statusCode).json(response);
}

export function sendError(res: Response, error: string, statusCode = 400, errors?: any[]): void {
  const response: ApiResponse = { success: false, error };
  if (errors) response.errors = errors;
  res.status(statusCode).json(response);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  pagination: PaginationQuery
): void {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function parsePagination(query: any): PaginationQuery {
  return {
    page: Math.max(1, parseInt(query.page || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(query.limit || '20', 10))),
    sortBy: query.sortBy || 'created_at',
    sortOrder: query.sortOrder === 'ASC' ? 'ASC' : 'DESC',
    search: query.search || '',
  };
}

export function generateCode(prefix: string, length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}
