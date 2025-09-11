import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API error response types
 */
export interface ApiError {
  error: string
  details?: any
  code?: string
}

/**
 * Standard API success response types
 */
export interface ApiSuccess<T = any> {
  data?: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any,
  code?: string
): NextResponse<ApiError> {
  const errorResponse: ApiError = {
    error: message,
    ...(details && { details }),
    ...(code && { code })
  }

  return NextResponse.json(errorResponse, { status })
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200,
  meta?: ApiSuccess['meta']
): NextResponse<ApiSuccess<T>> {
  const successResponse: ApiSuccess<T> = {
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(meta && { meta })
  }

  return NextResponse.json(successResponse, { status })
}

/**
 * Handles API errors with proper logging and response formatting
 */
export function handleApiError(
  error: unknown,
  context: string = 'API operation',
  logError: boolean = true
): NextResponse<ApiError> {
  if (logError) {
    console.error(`❌ ${context}:`, error)
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return createErrorResponse(
      'Validation failed',
      400,
      error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })),
      'VALIDATION_ERROR'
    )
  }

  // Handle known error types
  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return createErrorResponse(
        'Database connection error',
        503,
        undefined,
        'DATABASE_CONNECTION_ERROR'
      )
    }

    // Authentication errors
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      return createErrorResponse(
        'Authentication required',
        401,
        undefined,
        'AUTHENTICATION_ERROR'
      )
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return createErrorResponse(
        error.message,
        404,
        undefined,
        'NOT_FOUND_ERROR'
      )
    }

    // Return generic error with original message
    return createErrorResponse(
      error.message,
      500,
      undefined,
      'GENERIC_ERROR'
    )
  }

  // Handle unknown errors
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    undefined,
    'UNKNOWN_ERROR'
  )
}

/**
 * Validates required parameters and returns error response if missing
 */
export function validateRequiredParams(
  params: Record<string, any>,
  requiredFields: string[]
): NextResponse<ApiError> | null {
  const missingFields = requiredFields.filter(field => {
    const value = params[field]
    return value === undefined || value === null || value === ''
  })

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required parameters: ${missingFields.join(', ')}`,
      400,
      { missingFields },
      'MISSING_PARAMETERS'
    )
  }

  return null
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T = any>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('Failed to parse JSON, using fallback:', error)
    return fallback
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
  return createSuccessResponse(
    data,
    message,
    200,
    {
      total,
      page,
      limit
    }
  )
}