/**
 * Centralized Error Handler for API Responses
 *
 * This utility provides consistent error handling across all client-side API calls,
 * ensuring uniform error messaging and user feedback throughout the application.
 */

import { toast } from "sonner";
import { logger } from "@/lib/logger";

// API Response type definition
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  validationErrors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  timestamp?: string;
  requestId?: string;
}

/**
 * Handle API errors with consistent toast notifications and logging
 *
 * @param error - API response error or Error object
 * @param customMessage - Optional custom error message to display
 * @param options - Additional options for error handling
 */
export function handleApiError(
  error: ApiResponse<unknown> | Error,
  customMessage?: string,
  options?: {
    silent?: boolean; // Don't show toast
    logError?: boolean; // Log to console/server (default: true)
  }
): void {
  const { silent = false, logError = true } = options || {};

  // Handle Error instances (network errors, etc.)
  if (error instanceof Error) {
    if (logError) {
      logger.error("Network or client error", error);
    }

    if (!silent) {
      toast.error(customMessage || "Network Error", {
        description: error.message,
      });
    }
    return;
  }

  // Handle API response errors
  const errorMessage = customMessage || error.error || "Request Failed";
  const errorDetails = error.details
    ? typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details).slice(0, 100)
    : undefined;

  // Log validation errors with more detail
  if (error.validationErrors && error.validationErrors.length > 0) {
    if (logError) {
      logger.error("Validation error", new Error(errorMessage), {
        validationErrors: error.validationErrors,
      });
    }

    if (!silent) {
      const firstError = error.validationErrors[0];
      toast.error("Validation Error", {
        description: firstError
          ? `${firstError.field}: ${firstError.message}`
          : "Please check your input",
      });
    }
    return;
  }

  // Log standard API errors
  if (logError) {
    logger.error("API error", new Error(errorMessage), {
      code: error.code,
      details: error.details ? JSON.stringify(error.details) : undefined,
      requestId: error.requestId,
    });
  }

  // Show toast for standard errors
  if (!silent) {
    toast.error(errorMessage, {
      description: errorDetails,
    });
  }
}

/**
 * Handle API success with optional toast notification
 *
 * @param message - Success message to display
 * @param options - Additional options
 */
export function handleApiSuccess(
  message: string,
  options?: {
    description?: string;
    silent?: boolean;
  }
): void {
  const { description, silent = false } = options || {};

  if (!silent) {
    toast.success(message, {
      description,
    });
  }
}

/**
 * Wrap an API call with automatic error handling
 *
 * @param apiCall - Promise that returns an API response
 * @param options - Error handling options
 * @returns The API response data if successful, undefined otherwise
 */
export async function withErrorHandling<T>(
  apiCall: Promise<ApiResponse<T>>,
  options?: {
    errorMessage?: string;
    successMessage?: string;
    silent?: boolean;
    logError?: boolean;
  }
): Promise<T | undefined> {
  try {
    const response = await apiCall;

    if (response.success && response.data) {
      if (options?.successMessage) {
        handleApiSuccess(options.successMessage, { silent: options.silent });
      }
      return response.data;
    } else {
      handleApiError(response, options?.errorMessage, {
        silent: options?.silent,
        logError: options?.logError,
      });
      return undefined;
    }
  } catch (error) {
    handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      options?.errorMessage,
      {
        silent: options?.silent,
        logError: options?.logError,
      }
    );
    return undefined;
  }
}

/**
 * Check if an API response is successful
 *
 * @param response - API response to check
 * @returns Type guard for successful responses
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Extract error message from API response or Error
 *
 * @param error - API response or Error object
 * @returns Human-readable error message
 */
export function getErrorMessage(error: ApiResponse<unknown> | Error): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error.validationErrors && error.validationErrors.length > 0) {
    const firstError = error.validationErrors[0];
    return firstError
      ? `${firstError.field}: ${firstError.message}`
      : "Validation failed";
  }

  return error.error || "An unknown error occurred";
}
