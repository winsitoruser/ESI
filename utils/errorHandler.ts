import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  status?: number;
  details?: Record<string, any>;
}

/**
 * Format error for consistent error handling
 */
export function formatError(error: unknown): ErrorResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    return {
      success: false,
      status: axiosError.response?.status || 500,
      error: axiosError.response?.data?.error || 'Server error',
      message: axiosError.response?.data?.message || axiosError.message,
      details: axiosError.response?.data?.details
    };
  } else if (error instanceof Error) {
    return {
      success: false,
      error: error.name,
      message: error.message
    };
  }
  
  return {
    success: false,
    error: 'Unknown error',
    message: String(error)
  };
}

/**
 * Handle API errors consistently with toast notifications
 */
export function handleApiError(error: unknown, customMessage?: string): ErrorResponse {
  const formattedError = formatError(error);
  
  // Show toast notification
  toast.error(customMessage || formattedError.message || formattedError.error);
  
  // Log detailed error to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('API Error:', formattedError);
  }
  
  return formattedError;
}

/**
 * Check if a response is successful
 */
export function isSuccessResponse<T>(response: any): response is { success: true; data: T } {
  return response && response.success === true && response.data !== undefined;
}

/**
 * Safe fetch wrapper with error handling
 */
export async function safeFetch<T>(
  url: string, 
  options?: RequestInit
): Promise<{ success: true; data: T } | ErrorResponse> {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
        message: data.message || `Error ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }
    
    return { success: true, data: data as T };
  } catch (error) {
    return formatError(error);
  }
}
