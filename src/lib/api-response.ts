/**
 * Enhanced API Response System for PRIMA
 *
 * This replaces direct NextResponse usage with:
 * - Structured logging for all responses
 * - Consistent response formatting
 * - Request tracing with unique IDs
 * - Performance monitoring
 * - Error context preservation
 */

import { NextResponse, NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { ZodError } from "zod";

// ===== TYPES =====

export interface ApiResponseOptions {
  status?: number;
  message?: string;
  logLevel?: "debug" | "info" | "warn" | "error";
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  originalError?: string;
}

export interface ApiErrorDetails {
  code?: string;
  details?: any;
  validationErrors?: any[];
  originalError?: string;
}

// ===== RESPONSE WRAPPER FUNCTIONS =====

/**
 * Creates a standardized success response with logging
 */
export function apiSuccess<T = any>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse {
  const {
    status = 200,
    message = "Request completed successfully",
    logLevel = "info",
    context = {},
    requestId = crypto.randomUUID().slice(0, 8),
    userId,
    operation = "api_success",
    duration,
  } = options;

  // Log the successful response
  logger.api(message, {
    ...context,
    operation,
    status,
    requestId,
    userId,
    duration,
    responseType: "success",
    dataSize: JSON.stringify(data).length,
  });

  // Build headers object, filtering out undefined values
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
  };

  if (duration) {
    headers["X-Response-Time"] = `${duration}ms`;
  }

  // Return standardized response
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status,
      headers,
    }
  );
}

/**
 * Creates a standardized error response with logging
 */
export function apiError(
  message: string,
  options: ApiResponseOptions & ApiErrorDetails = {}
): NextResponse {
  const {
    status = 500,
    logLevel = "error",
    context = {},
    requestId = crypto.randomUUID().slice(0, 8),
    userId,
    operation = "api_error",
    duration,
    code,
    details,
    validationErrors,
    originalError,
  } = options;

  // Log the error response
  const errorContext = {
    ...context,
    operation,
    status,
    requestId,
    userId,
    duration,
    responseType: "error",
    errorCode: code,
    hasValidationErrors: !!validationErrors,
    originalError: originalError?.substring(0, 200), // Truncate long errors
  };

  if (logLevel === "error") {
    logger.error(message, new Error("API Error"), errorContext);
  } else {
    logger[logLevel](message, errorContext);
  }

  // Build headers object, filtering out undefined values
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
  };

  if (duration) {
    headers["X-Response-Time"] = `${duration}ms`;
  }

  // Return standardized error response
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details,
      validationErrors,
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status,
      headers,
    }
  );
}

// ===== SPECIALIZED RESPONSE FUNCTIONS =====

/**
 * Creates a validation error response
 */
export function apiValidationError(
  errors: any[],
  options: ApiResponseOptions = {}
): NextResponse {
  return apiError("Validation failed", {
    ...options,
    status: 400,
    code: "VALIDATION_ERROR",
    validationErrors: errors,
    logLevel: "warn",
  });
}

/**
 * Creates an authentication error response
 */
export function apiAuthError(
  message: string = "Authentication required",
  options: ApiResponseOptions = {}
): NextResponse {
  return apiError(message, {
    ...options,
    status: 401,
    code: "AUTHENTICATION_ERROR",
    logLevel: "warn",
  });
}

/**
 * Creates an authorization error response
 */
export function apiAuthzError(
  message: string = "Insufficient permissions",
  options: ApiResponseOptions = {}
): NextResponse {
  return apiError(message, {
    ...options,
    status: 403,
    code: "AUTHORIZATION_ERROR",
    logLevel: "warn",
  });
}

/**
 * Creates a not found error response
 */
export function apiNotFoundError(
  resource: string = "Resource",
  options: ApiResponseOptions = {}
): NextResponse {
  return apiError(`${resource} not found`, {
    ...options,
    status: 404,
    code: "NOT_FOUND_ERROR",
    logLevel: "info",
  });
}

/**
 * Creates a rate limit error response
 */
export function apiRateLimitError(
  options: ApiResponseOptions = {}
): NextResponse {
  return apiError("Rate limit exceeded", {
    ...options,
    status: 429,
    code: "RATE_LIMIT_ERROR",
    logLevel: "warn",
  });
}

// ===== UTILITY FUNCTIONS =====

/**
 * Extracts request context for logging
 */
export function extractRequestContext(
  request: NextRequest,
  userId?: string
): Record<string, any> {
  const url = new URL(request.url);

  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get("user-agent"),
    ip:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userId,
  };
}

/**
 * Handles Zod validation errors
 */
export function handleZodError(
  error: ZodError,
  options: ApiResponseOptions = {}
): NextResponse {
  const validationErrors = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return apiValidationError(validationErrors, {
    ...options,
    originalError: error.message,
  });
}

/**
 * Wraps an async handler with error handling and logging
 */
export function withApiHandler<TInput = any, TOutput = any>(
  handler: (input: TInput, context: any) => Promise<TOutput>,
  options: {
    operation?: string;
    logSuccess?: boolean;
    logErrors?: boolean;
  } = {}
) {
  const {
    operation = "api_handler",
    logSuccess = true,
    logErrors = true,
  } = options;

  return async (input: TInput, context: any): Promise<TOutput> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
      const result = await handler(input, { ...context, requestId });

      if (logSuccess) {
        logger.info(`${operation} completed successfully`, {
          operation,
          requestId,
          duration: Date.now() - startTime,
          userId: context?.user?.id,
        });
      }

      return result;
    } catch (error) {
      if (logErrors) {
        logger.error(`${operation} failed`, error as Error, {
          operation,
          requestId,
          duration: Date.now() - startTime,
          userId: context?.user?.id,
        });
      }

      throw error;
    }
  };
}

// ===== LEGACY COMPATIBILITY =====

/**
 * Legacy wrapper for existing NextResponse usage
 * This allows gradual migration
 */
export function createLegacyResponse(
  data: any,
  options: { status?: number } = {}
): NextResponse {
  const { status = 200 } = options;

  // Log legacy response usage for migration tracking
  logger.debug("Legacy NextResponse usage detected", {
    operation: "legacy_response",
    status,
    dataType: typeof data,
  });

  return NextResponse.json(data, { status });
}
