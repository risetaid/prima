/**
 * Consolidated API Helpers for PRIMA Medical System
 *
 * This combines api-handler.ts, api-response.ts, and api-utils.ts
 * into a single, simplified utility file for API operations.
 */

import { NextResponse, NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/lib/auth-utils";
// Top-level imports for better performance (avoid dynamic imports in hot paths)
import { getAuthUser } from "@/lib/auth-utils";
import { get as cacheGet, set as cacheSet } from "@/lib/cache";

// ===== TYPES =====

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponseOptions {
  status?: number;
  message?: string;
  logLevel?: "debug" | "info" | "warn" | "error";
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  originalError?: string;
}

export interface ApiErrorDetails {
  code?: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
  originalError?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

export interface ApiSuccess<T = unknown> {
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// ===== RESPONSE FUNCTIONS =====

/**
 * Creates a standardized success response with logging
 */
export function apiSuccess<T = unknown>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse {
  const {
    status = 200,
    message = "Request completed successfully",
    context = {},
    requestId = crypto.randomUUID().slice(0, 8),
    userId,
    operation = "api_success",
    duration,
  } = options;

  // Log the successful response
  logger.info(message, {
    ...context,
    operation,
    status,
    requestId,
    userId,
    duration,
    responseType: "success",
    dataSize: JSON.stringify(data).length,
  });

  // Build headers object
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
  };

  if (duration) {
    headers["X-Response-Time"] = `${duration}ms`;
  }

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
    originalError: originalError?.substring(0, 200),
  };

  if (logLevel === "error") {
    logger.error(message, new Error("API Error"), errorContext);
  } else {
    logger[logLevel](message, errorContext);
  }

  // Build headers object
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
  };

  if (duration) {
    headers["X-Response-Time"] = `${duration}ms`;
  }

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

/**
 * Creates a validation error response
 */
export function apiValidationError(
  errors: ValidationError[],
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

// ===== LEGACY COMPATIBILITY =====

/**
 * Creates a standardized error response (legacy compatibility)
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: unknown,
  code?: string
): NextResponse<ApiError> {
  const errorResponse: ApiError = {
    error: message,
    ...(details !== undefined && { details }),
    ...(code && { code }),
  };

  return NextResponse.json(errorResponse, { status });
}

/**
 * Creates a standardized success response (legacy compatibility)
 */
export function createSuccessResponse<T = unknown>(
  data?: T,
  message?: string,
  status: number = 200,
  meta?: ApiSuccess["meta"]
): NextResponse<ApiSuccess<T>> {
  const successResponse: ApiSuccess<T> = {
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(meta && { meta }),
  };

  return NextResponse.json(successResponse, { status });
}

/**
 * Handles API errors with proper logging and response formatting
 */
export function handleApiError(
  error: unknown,
  context: string = "API operation",
  logError: boolean = true
): NextResponse<ApiError> {
  if (logError) {
    logger.error(
      `${context} failed`,
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: "api_error_handling",
        context,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return createErrorResponse(
      "Validation failed",
      400,
      error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
      "VALIDATION_ERROR"
    );
  }

  // Handle known error types
  if (error instanceof Error) {
    // Database connection errors
    if (
      error.message.includes("connection") ||
      error.message.includes("timeout")
    ) {
      return createErrorResponse(
        "Database connection error",
        503,
        undefined,
        "DATABASE_CONNECTION_ERROR"
      );
    }

    // Authentication errors
    if (
      error.message.includes("unauthorized") ||
      error.message.includes("forbidden")
    ) {
      return createErrorResponse(
        "Authentication required",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    // Not found errors
    if (error.message.includes("not found")) {
      return createErrorResponse(
        error.message,
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    // Return generic error with original message
    return createErrorResponse(error.message, 500, undefined, "GENERIC_ERROR");
  }

  // Handle unknown errors
  return createErrorResponse(
    "An unexpected error occurred",
    500,
    undefined,
    "UNKNOWN_ERROR"
  );
}

/**
 * Validates required parameters and returns error response if missing
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  requiredFields: string[]
): NextResponse<ApiError> | null {
  const missingFields = requiredFields.filter((field) => {
    const value = params[field];
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required parameters: ${missingFields.join(", ")}`,
      400,
      { missingFields },
      "MISSING_PARAMETERS"
    );
  }

  return null;
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T = unknown>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.warn("JSON parsing failed, using fallback", {
      operation: "json_parsing",
      error: error instanceof Error ? error.message : String(error),
      fallbackType: typeof fallback,
    });
    return fallback;
  }
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): NextResponse<ApiSuccess<T[]>> {
  return createSuccessResponse(data, message, 200, {
    total,
    page,
    limit,
  });
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
 * Extracts request context for logging
 */
export function extractRequestContext(
  request: NextRequest,
  userId?: string
): Record<string, unknown> {
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

// ===== SIMPLE RESPONSE HELPERS =====

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  code?: string,
  details?: Record<string, unknown>,
  status = 400
) {
  return apiError(message, {
    status,
    code,
    details,
  });
}

// ===== API HANDLER WRAPPER =====

// Use CLERK_SECRET_KEY as internal API key for testing/service calls
// This is secure because CLERK_SECRET_KEY is already a sensitive credential
const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || process.env.CLERK_SECRET_KEY;

// System user for API key authentication (used for load testing)
// Matches AuthUser interface from auth-utils.ts
const API_KEY_SYSTEM_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000000", // Valid UUID format
  clerkId: "system-api-key",
  email: "system@prima.test",
  firstName: "System",
  lastName: "API",
  hospitalName: "PRIMA System",
  role: "DEVELOPER", // Full access for testing
  isActive: true,
  isApproved: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
  approvedAt: new Date(),
  approvedBy: null,
  deletedAt: null,
  canAccessDashboard: true,
  needsApproval: false,
};

/**
 * Check if request has valid internal API key
 */
function hasValidInternalApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("X-API-Key");
  return !!(apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY);
}

export interface ApiHandlerOptions {
  auth?: "required" | "optional" | "custom";
  customAuth?: (request: NextRequest) => Promise<AuthUser | null>;
  rateLimit?: { enabled: boolean };
  cache?: { ttl: number; key: string };
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}

export interface ApiHandlerContext {
  user?: AuthUser;
  request: NextRequest;
  params?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

/**
 * Creates a standardized API handler with authentication, validation, and error handling
 */
export function createApiHandler<T = unknown, R = unknown>(
  options: ApiHandlerOptions,
  handler: (data: T, context: ApiHandlerContext) => Promise<R>
) {
  return async function (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
      // Resolve params
      const resolvedParams = params ? await params : {};
      const context: ApiHandlerContext = {
        request,
        params: resolvedParams as Record<string, string>,
      };

      // Check for internal API key bypass first (for load testing and internal services)
      // This allows authenticated testing without Clerk session tokens
      if (hasValidInternalApiKey(request)) {
        context.user = API_KEY_SYSTEM_USER;
        // Skip normal auth flow - API key provides system-level access
      }
      // Handle authentication (only if no valid API key)
      else if (options.auth === "required") {
        const user = await getAuthUser();
        if (!user) {
          return apiAuthError("Authentication required", {
            requestId,
            operation: "api_handler_auth",
          });
        }
        context.user = user;
      } else if (options.auth === "optional") {
        const user = await getAuthUser();
        if (user) {
          context.user = user;
        }
      } else if (options.auth === "custom") {
        if (!options.customAuth) {
          throw new Error(
            "Custom auth function is required when auth='custom'"
          );
        }
        const user = await options.customAuth(request);
        if (user) {
          context.user = user;
        }
        // Note: Custom auth doesn't throw errors - it's up to the custom function
        // to return null if authentication fails, and the handler can decide what to do
      }

      // Parse body
      let body: T;
      if (request.method !== "GET" && request.method !== "DELETE") {
        const contentType = request.headers.get("content-type") || "";
        try {
          if (contentType.includes("application/json")) {
            body = await request.json();
          } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
          ) {
            const form = await request.formData();
            const formData: Record<string, unknown> = {};
            form.forEach((v, k) => {
              formData[k] = v;
            });
            body = formData as T;
          } else {
            // Try JSON first, then fallback to empty object
            try {
              body = await request.json();
            } catch {
              body = {} as T;
            }
          }
        } catch {
          body = {} as T;
        }

        // Validate body if schema provided
        if (options.body) {
          try {
            body = options.body.parse(body) as T;
          } catch (error) {
            if (error instanceof ZodError) {
              return handleZodError(error, {
                requestId,
                operation: "api_handler_validation",
              });
            }
            throw error;
          }
        }
      } else {
        body = {} as T;
      }
      context.body = body;

      // Validate params if schema provided
      if (options.params && context.params) {
        try {
          context.params = options.params.parse(context.params) as Record<
            string,
            string
          >;
        } catch (error) {
          if (error instanceof ZodError) {
            return handleZodError(error, {
              requestId,
              operation: "api_handler_params_validation",
            });
          }
          throw error;
        }
      }

      // Parse query parameters
      const url = new URL(request.url);
      context.query = Object.fromEntries(url.searchParams);
      if (options.query) {
        try {
          context.query = options.query.parse(context.query) as Record<
            string,
            string
          >;
        } catch (error) {
          if (error instanceof ZodError) {
            return handleZodError(error, {
              requestId,
              operation: "api_handler_query_validation",
            });
          }
          throw error;
        }
      }

      // Check cache if enabled (using top-level imports for performance)
      if (options.cache && request.method === "GET") {
        const cacheKey = `${options.cache.key}:${JSON.stringify(
          context.query
        )}:${context.user?.id || "anonymous"}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
          return apiSuccess(cached, {
            requestId,
            operation: "api_handler_cache_hit",
            duration: Date.now() - startTime,
          });
        }
      }

      // Execute the handler
      const result = await handler(body, context);

      // Set cache if enabled (using top-level imports for performance)
      if (options.cache && request.method === "GET") {
        const cacheKey = `${options.cache.key}:${JSON.stringify(
          context.query
        )}:${context.user?.id || "anonymous"}`;
        await cacheSet(cacheKey, result, options.cache.ttl);
      }

      return apiSuccess(result, {
        requestId,
        operation: "api_handler_success",
        duration: Date.now() - startTime,
        userId: context.user?.id,
      });
    } catch (error) {
      return handleApiError(error, "API Handler", true);
    }
  };
}
