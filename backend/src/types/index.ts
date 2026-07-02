import { Request } from 'express';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  tenantId: number;
  branchId?: number;
  permissions?: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  tenantId?: number;
  branchId?: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export type ModuleName =
  | 'auth' | 'onboarding' | 'branch' | 'settings'
  | 'product' | 'pos' | 'inventory' | 'purchase'
  | 'customer' | 'loyalty' | 'promo' | 'crm'
  | 'kitchen' | 'table' | 'employee' | 'hris'
  | 'finance-lite' | 'finance-pro' | 'sfa' | 'marketing'
  | 'fleet' | 'tms' | 'manufacturing' | 'asset'
  | 'project' | 'procurement' | 'exim' | 'reports'
  | 'whatsapp' | 'marketplace' | 'website-builder'
  | 'knowledge-base' | 'billing' | 'admin' | 'notification'
  | 'audit';
