/**
 * API Client Utility
 * 
 * Centralized API client for making requests to the backend with proper error handling.
 * This replaces the previous approach of using mock data fallbacks.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 8000, // 8 seconds timeout (reduced from 15s)
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle session expiration
    if (error.response?.status === 401) {
      // Clear session if unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // Log the error for debugging
    console.error('API request failed:', error);
    
    // Throw error to be handled by the component
    return Promise.reject(error);
  }
);

/**
 * Generic API request function with typed response
 * 
 * @param method HTTP method
 * @param endpoint API endpoint
 * @param data Request data (for POST, PUT, PATCH)
 * @param config Additional axios config
 * @returns Promise with typed response data
 */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    let response: AxiosResponse<T>;

    switch (method) {
      case 'GET':
        response = await apiClient.get<T>(endpoint, config);
        break;
      case 'POST':
        response = await apiClient.post<T>(endpoint, data, config);
        break;
      case 'PUT':
        response = await apiClient.put<T>(endpoint, data, config);
        break;
      case 'PATCH':
        response = await apiClient.patch<T>(endpoint, data, config);
        break;
      case 'DELETE':
        response = await apiClient.delete<T>(endpoint, { data, ...config });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return response.data;
  } catch (error: any) {
    // Convert error to a more useful format
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    const errorStatus = error.response?.status;
    
    // Enhanced error with additional context
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).status = errorStatus;
    (enhancedError as any).originalError = error;
    
    throw enhancedError;
  }
}

/**
 * Typed convenience methods
 */
export const api = {
  get: <T>(endpoint: string, config?: AxiosRequestConfig) => 
    apiRequest<T>('GET', endpoint, undefined, config),
  
  post: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    apiRequest<T>('POST', endpoint, data, config),
  
  put: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    apiRequest<T>('PUT', endpoint, data, config),
  
  patch: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    apiRequest<T>('PATCH', endpoint, data, config),
  
  delete: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    apiRequest<T>('DELETE', endpoint, data, config)
};

export default api;
