/**
 * Data Fetcher Utility
 * 
 * This utility provides standardized functions for fetching data from the backend.
 * It removes all mock data fallbacks and ensures consistent error handling.
 */

import { api } from './api-client';
import logger from '@/lib/logger';
import { Product, ProductsResponse, ProductResponse, ProductFilter, LowStockProductsResponse } from '@/types/product';

/**
 * Generic data fetching function with strong typing and error handling
 * @param endpoint API endpoint to fetch data from
 * @param params Optional query parameters
 * @returns The fetched data or throws an error
 */
export async function fetchData<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  try {
    // Build query string if params are provided
    const queryString = params 
      ? '?' + Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&')
      : '';

    return await api.get<T>(`${endpoint}${queryString}`);
  } catch (error: any) {
    logger.error(`Failed to fetch data from ${endpoint}:`, error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

/**
 * Post data to an API endpoint
 * @param endpoint API endpoint to post data to
 * @param data Data to post
 * @returns The response data
 */
export async function postData<T, R = any>(endpoint: string, data: T): Promise<R> {
  try {
    return await api.post<R>(endpoint, data);
  } catch (error: any) {
    logger.error(`Failed to post data to ${endpoint}:`, error);
    throw new Error(`Failed to post data: ${error.message}`);
  }
}

/**
 * Update data at an API endpoint
 * @param endpoint API endpoint to update data at
 * @param id ID of the resource to update
 * @param data Data to update
 * @returns The updated data
 */
export async function updateData<T, R = any>(endpoint: string, id: string, data: T): Promise<R> {
  try {
    return await api.put<R>(`${endpoint}/${id}`, data);
  } catch (error: any) {
    logger.error(`Failed to update data at ${endpoint}/${id}:`, error);
    throw new Error(`Failed to update data: ${error.message}`);
  }
}

/**
 * Delete a resource at an API endpoint
 * @param endpoint API endpoint to delete data from
 * @param id ID of the resource to delete
 * @returns True if successful
 */
export async function deleteData(endpoint: string, id: string): Promise<boolean> {
  try {
    await api.delete(`${endpoint}/${id}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to delete data at ${endpoint}/${id}:`, error);
    throw new Error(`Failed to delete data: ${error.message}`);
  }
}

/**
 * Resource-specific fetchers
 */

// Products
export const fetchProducts = (params?: ProductFilter): Promise<ProductsResponse> => 
  fetchData<ProductsResponse>('/api/inventory/products', params);

export const fetchProductById = (id: string): Promise<ProductResponse> => 
  fetchData<ProductResponse>(`/api/inventory/products/${id}`);

export const fetchLowStockProducts = (): Promise<LowStockProductsResponse> => 
  fetchData<LowStockProductsResponse>('/api/inventory/products/low-stock');

// Inventory
export const fetchInventoryMovements = (params?: {
  type?: 'in' | 'out';
  productId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => fetchData('/api/inventory/movements', params);

// Customers
export const fetchCustomers = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => fetchData('/api/customers', params);

// Transactions
export const fetchTransactions = (params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => fetchData('/api/transactions', params);

export const fetchTransactionById = (id: string) => fetchData(`/api/transactions/${id}`);

// Finance
export const fetchFinanceSummary = () => fetchData('/api/finance/summary');

export const fetchFinanceLedger = (params?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  page?: number;
  limit?: number;
}) => fetchData('/api/finance/ledger', params);

// Export all functions
export default {
  fetchData,
  postData,
  updateData,
  deleteData,
  fetchProducts,
  fetchProductById,
  fetchLowStockProducts,
  fetchInventoryMovements,
  fetchCustomers,
  fetchTransactions,
  fetchTransactionById,
  fetchFinanceSummary,
  fetchFinanceLedger
};
