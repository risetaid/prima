/**
 * Metrics Endpoint - Prometheus-compatible metrics
 *
 * REQUIRES: X-API-Key header + rate limited
 * Returns Prometheus-compatible metrics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePrometheusMetrics } from '@/lib/metrics';
import { RateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/metrics
 * Returns Prometheus-compatible metrics
 *
 * Security: Requires internal API key authentication
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Check API key
    const apiKey = request.headers.get('X-API-Key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      return new NextResponse('Internal API key not configured', { status: 500 });
    }

    if (apiKey !== expectedKey) {
      return new NextResponse('Invalid API key', { status: 401 });
    }

    // 2. Rate limit (10 requests per minute for internal monitoring)
    const clientIp =
      request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await RateLimiter.checkRateLimit(
      `metrics:${clientIp}`,
      { windowMs: 60 * 1000, maxRequests: 10 }
    );

    if (!rateLimitResult.allowed) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'RateLimit-Limit': '10',
          'RateLimit-Remaining': '0',
          'Retry-After': String(
            Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          ),
        },
      });
    }

    // 3. Generate metrics
    const metrics = await generatePrometheusMetrics();

    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'RateLimit-Limit': '10',
        'RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    logger.error('Failed to generate metrics', error instanceof Error ? error : new Error(String(error)));
    return new NextResponse('Failed to generate metrics', {
      status: 500,
    });
  }
}
