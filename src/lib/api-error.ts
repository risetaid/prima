import { NextResponse } from 'next/server'

interface ApiErrorDetails {
  message: string
  code?: string
  details?: any
}

export function apiError(status: number, error: ApiErrorDetails): NextResponse {
  console.error(`API Error [${status}]: ${error.message}`, error.details)
  
  return NextResponse.json(
    { 
      success: false, 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details })
    }, 
    { status }
  )
}

export function unauthorizedError(message = 'Unauthorized'): NextResponse {
  return apiError(401, { message, code: 'UNAUTHORIZED' })
}

export function forbiddenError(message = 'Forbidden'): NextResponse {
  return apiError(403, { message, code: 'FORBIDDEN' })
}

export function notFoundError(message = 'Not found'): NextResponse {
  return apiError(404, { message, code: 'NOT_FOUND' })
}

export function validationError(issues: any[] | string, message = 'Validation error'): NextResponse {
  return apiError(400, { 
    message, 
    code: 'VALIDATION_ERROR', 
    details: issues 
  })
}

export function internalError(details?: any, message = 'Internal server error'): NextResponse {
  return apiError(500, { 
    message, 
    code: 'INTERNAL_ERROR', 
    details 
  })
}

// Indonesian-specific errors for user-facing responses
export function unauthorizedIndo(): NextResponse {
  return unauthorizedError('Anda tidak memiliki izin untuk mengakses sumber daya ini')
}

export function notFoundIndo(): NextResponse {
  return notFoundError('Data tidak ditemukan')
}

export function validationIndo(message = 'Data tidak valid'): NextResponse {
  return apiError(400, { message, code: 'VALIDATION_ERROR' })
}

export function serverErrorIndo(): NextResponse {
  return internalError(undefined, 'Terjadi kesalahan server. Silakan coba lagi nanti.')
}