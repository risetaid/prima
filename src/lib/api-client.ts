/**
 * Centralized API Client for PRIMA Medical System
 * 
 * Provides a typed, consistent interface for all API calls with:
 * - Automatic request ID tracking
 * - Standardized error handling
 * - Type-safe responses
 * - Built-in logging
 */

import { logger } from '@/lib/logger';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  validationErrors?: ValidationError[];
  timestamp: string;
  requestId: string;
}

export interface ApiClientOptions extends RequestInit {
  skipErrorLog?: boolean;
}

/**
 * Type-safe API client with standardized error handling
 * 
 * @example
 * const result = await apiClient<Patient>('/api/patients/123');
 * if (result.success && result.data) {
 *   // Use result.data
 * } else {
 *   // Handle error: result.error
 * }
 */
export async function apiClient<T>(
  url: string,
  options?: ApiClientOptions
): Promise<ApiResponse<T>> {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Request-Id': requestId,
      },
    });

    // Parse response
    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, create error response
      logger.error('API Client: Failed to parse response', parseError as Error, {
        url,
        status: response.status,
        requestId,
      });
      
      return {
        success: false,
        error: 'Invalid response format from server',
        code: 'PARSE_ERROR',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }

    const duration = performance.now() - startTime;

    // Log the request (success or error)
    if (result.success) {
      logger.info('API Client: Request successful', {
        url,
        method: options?.method || 'GET',
        status: response.status,
        requestId,
        durationMs: duration.toFixed(2),
      });
    } else if (!options?.skipErrorLog) {
      logger.warn('API Client: Request failed', {
        url,
        method: options?.method || 'GET',
        status: response.status,
        error: result.error,
        code: result.code,
        requestId,
        durationMs: duration.toFixed(2),
      });
    }

    // Check for slow requests
    if (duration > 1000) {
      logger.warn('API Client: Slow request detected', {
        url,
        durationMs: duration.toFixed(2),
        requestId,
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Network error or fetch failure
    if (!options?.skipErrorLog) {
      logger.error('API Client: Network error', error as Error, {
        url,
        method: options?.method || 'GET',
        requestId,
        durationMs: duration.toFixed(2),
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      code: 'NETWORK_ERROR',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
}

/**
 * Helper to handle API errors consistently
 * Returns error message suitable for user display
 */
export function getApiErrorMessage(response: ApiResponse<unknown>): string {
  if (response.validationErrors && response.validationErrors.length > 0) {
    return response.validationErrors[0].message;
  }
  
  return response.error || 'An unexpected error occurred';
}

/**
 * Helper to check if response is successful with data
 * Type guard for TypeScript
 */
export function isSuccessWithData<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Legacy: Unwraps a standardized API response to get the actual data
 * @deprecated Use apiClient() instead for better error handling
 */
export function unwrapApiResponse<T = unknown>(response: ApiResponse<T> | T): T {
  // Check if response has the standard wrapper structure
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data as T;
  }
  
  // Return as-is if not wrapped (backward compatibility)
  return response as T;
}

/**
 * Legacy: Fetches from an API endpoint and automatically unwraps the response
 * @deprecated Use apiClient() instead for better error handling
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
