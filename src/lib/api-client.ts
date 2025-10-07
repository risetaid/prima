/**
 * Client-side API helper to unwrap standardized API responses
 * 
 * Our API uses createApiHandler which wraps responses in:
 * { success: true, data: {...}, message: "...", timestamp: "...", requestId: "..." }
 * 
 * This helper extracts the actual data from the wrapper.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  requestId?: string;
  error?: string;
}

/**
 * Unwraps a standardized API response to get the actual data
 * Falls back to the original response if it's not wrapped
 */
export function unwrapApiResponse<T = unknown>(response: ApiResponse<T> | T): T {
  // Check if response has the standard wrapper structure
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data;
  }
  
  // Return as-is if not wrapped (backward compatibility)
  return response as T;
}

/**
 * Fetches from an API endpoint and automatically unwraps the response
 */
export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  
  const json = await response.json();
  return unwrapApiResponse<T>(json);
}
