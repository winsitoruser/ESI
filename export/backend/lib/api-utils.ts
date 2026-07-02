export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  status: number;
  message?: string;
}

/**
 * Standardized error handling for API requests
 * @param response Fetch response object
 * @param showToast Whether to show toast notifications (not used in server-side)
 * @returns Standardized API response
 */
export async function handleApiResponse<T>(
  response: Response, 
  showToast = true
): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();
    
    if (response.ok) {
      return { data, error: null, success: true, status: response.status, message: data.message };
    } else {
      const errorMessage = data.error || 'An error occurred';
      return { data: null, error: errorMessage, success: false, status: response.status };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { data: null, error: errorMessage, success: false, status: 500 };
  }
}

/**
 * Safely handle errors in async functions
 * @param fn Async function to execute
 * @param fallbackValue Fallback value to return in case of error
 * @returns Result of the function or fallback value
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Error in async operation:', error);
    return fallbackValue;
  }
}
