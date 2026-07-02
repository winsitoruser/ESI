/**
 * API Fetcher Utility
 * Provides standardized methods for fetching data from APIs with proper error handling,
 * timeout handling, and mock data fallback as per FARMANESIA-EVO's "Data Mock First" pattern.
 */

import { logger } from '@/server/monitoring';

const apiLogger = logger.child({ service: 'api-fetcher' });

interface FetchOptions extends RequestInit {
  timeout?: number;
  mockData?: any;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  isMock?: boolean;
  statusCode?: number;
}

/**
 * Enhanced fetch function with timeout, retry logic, and mock data fallback
 */
export async function fetchWithFallback<T>(
  url: string, 
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { 
    timeout = 8000, 
    mockData = null,
    retries = 1,
    retryDelay = 1000,
    ...fetchOptions 
  } = options;
  
  // Ensure credentials are included for session auth
  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...fetchOptions,
  };

  // Setup AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  mergedOptions.signal = controller.signal;
  
  try {
    let attemptCount = 0;
    let lastError: Error | null = null;
    
    // Retry logic
    while (attemptCount <= retries) {
      try {
        const response = await fetch(url, mergedOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          data,
          statusCode: response.status,
          isMock: false
        };
      } catch (error: any) {
        lastError = error;
        attemptCount++;
        
        if (attemptCount <= retries) {
          apiLogger.warn(`Fetch attempt ${attemptCount} failed, retrying in ${retryDelay}ms`, { 
            url, 
            error: error.message 
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // If we exhausted retries and have mockData, use it
    if (mockData) {
      apiLogger.info(`Using mock data fallback for ${url}`);
      return {
        success: true,
        data: mockData,
        isMock: true,
        error: lastError?.message
      };
    }
    
    // If no mockData, return error
    throw lastError;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    apiLogger.error(`API fetch error for ${url}`, { 
      error: error.message, 
      isTimeout: error.name === 'AbortError'
    });
    
    // Return mock data if provided, otherwise return error response
    if (mockData) {
      return {
        success: true,
        data: mockData,
        isMock: true,
        error: error.message
      };
    }
    
    return {
      success: false,
      data: null,
      error: error.message,
      isMock: false
    };
  }
}

/**
 * GET request with standardized options
 */
export function get<T>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  return fetchWithFallback<T>(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * POST request with standardized options
 */
export function post<T>(
  url: string, 
  data: any, 
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchWithFallback<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * PUT request with standardized options
 */
export function put<T>(
  url: string, 
  data: any, 
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchWithFallback<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * DELETE request with standardized options
 */
export function del<T>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  return fetchWithFallback<T>(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Create cache key from URL and parameters
 */
export function createCacheKey(url: string, params?: Record<string, any>): string {
  if (!params) return url;
  
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
    
  return `${url}:${JSON.stringify(sortedParams)}`;
}
