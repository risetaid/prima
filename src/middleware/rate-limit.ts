import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, getClientIP, getUserIdentifier, API_RATE_LIMITS } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

/**
 * Rate limiting middleware for API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: keyof typeof API_RATE_LIMITS = 'GENERAL'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const config = API_RATE_LIMITS[endpoint]
    const clientIP = getClientIP(request)

    // Get user identifier (prefer authenticated user ID over IP)
    const userId = request.headers.get('x-user-id') // Set by auth middleware
    const identifier = getUserIdentifier(request, userId === null ? undefined : userId)

    const rateLimitResult = await RateLimiter.checkRateLimit(identifier, config)

    // Add rate limit headers to the request for use in the route handler
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-ratelimit-limit', config.maxRequests.toString())
    requestHeaders.set('x-ratelimit-remaining', rateLimitResult.remaining.toString())
    requestHeaders.set('x-ratelimit-reset', Math.ceil(rateLimitResult.resetTime / 1000).toString())

    if (!rateLimitResult.allowed) {
      logger.security('Rate limit exceeded', {
        identifier,
        endpoint,
        clientIP,
        userId: userId ?? undefined,
        limit: config.maxRequests,
        windowMs: config.windowMs,
        remaining: rateLimitResult.remaining
      })

      const response = NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      )

      return { allowed: false, response }
    }

    return { allowed: true, response: undefined }
  } catch (error) {
    logger.error('Rate limit middleware error', error instanceof Error ? error : new Error(String(error)), {
      endpoint,
      url: request.url
    })

    // On middleware error, allow the request to prevent blocking
    return { allowed: true, response: undefined }
  }
}

/**
 * Higher-order function to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => Promise<NextResponse>,
  endpoint: keyof typeof API_RATE_LIMITS = 'GENERAL'
) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }): Promise<NextResponse> => {
    const rateLimitResult = await rateLimitMiddleware(request, endpoint)

    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response
    }

    return handler(request, context)
  }
}

/**
 * Rate limiting for specific HTTP methods
 */
export function withMethodRateLimit(
  handler: (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => Promise<NextResponse>,
  methodLimits: Partial<Record<string, keyof typeof API_RATE_LIMITS>> = {}
) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }): Promise<NextResponse> => {
    const method = request.method.toUpperCase()
    const endpoint = methodLimits[method] || 'GENERAL'

    const rateLimitResult = await rateLimitMiddleware(request, endpoint)

    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response
    }

    return handler(request, context)
  }
}

/**
 * Authentication-specific rate limiting
 */
export async function authRateLimit(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  return rateLimitMiddleware(request, 'AUTH')
}

/**
 * File upload rate limiting
 */
export async function uploadRateLimit(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  return rateLimitMiddleware(request, 'UPLOAD')
}

/**
 * WhatsApp API rate limiting
 */
export async function whatsappRateLimit(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  return rateLimitMiddleware(request, 'WHATSAPP')
}

/**
 * Admin operations rate limiting
 */
export async function adminRateLimit(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  return rateLimitMiddleware(request, 'ADMIN')
}

