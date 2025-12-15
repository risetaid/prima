import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
import { logger } from "@/lib/logger";
import { featureFlags } from "@/lib/feature-flags";
import { metrics } from "@/lib/metrics";

const isProtectedRoute = createRouteMatcher([
  "/pasien(.*)",
  "/pengingat(.*)",
  "/berita(.*)",
  "/video-edukasi(.*)",
  "/cms(.*)",
  "/admin(.*)",
  "/api/patients(.*)",
  "/api/admin(.*)",
  "/api/reminders(.*)",
  "/api/user(.*)",
  "/api/upload(.*)",
  "/api/content(.*)",
  "/api/cms(.*)",
  "/api/dashboard(.*)",
]);

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

// Rate limiting for failed API key attempts (in-memory, simple)
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 failures per minute

function isRateLimited(ip: string | null): boolean {
  if (!ip) return false;
  
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  
  if (!attempts) return false;
  
  // Reset if window expired
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    failedAttempts.delete(ip);
    return false;
  }
  
  return attempts.count >= RATE_LIMIT_MAX;
}

function recordFailedAttempt(ip: string | null): void {
  if (!ip) return;
  
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  
  if (!attempts || now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    failedAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    attempts.count++;
  }
  
  metrics.increment('api_key.failed_attempts');
}

/**
 * Check if request has valid internal API key
 * Uses timing-safe comparison when SECURITY_TIMING_SAFE_AUTH flag is enabled
 */
function hasValidApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("X-API-Key");
  
  if (!apiKey || !INTERNAL_API_KEY) {
    return false;
  }
  
  // Check rate limiting
  const ip = req.ip || req.headers.get('x-forwarded-for');
  if (isRateLimited(ip)) {
    logger.security('API key rate limit exceeded', {
      operation: 'api_key.validation',
      ip,
    });
    metrics.increment('api_key.rate_limited');
    return false;
  }
  
  let isValid = false;
  
  if (featureFlags.isEnabled('SECURITY_TIMING_SAFE_AUTH')) {
    // NEW: Timing-safe comparison
    try {
      // Pad both strings to same length to prevent length leak
      const keyBuffer = Buffer.from(apiKey.padEnd(64, '\0'));
      const expectedBuffer = Buffer.from(INTERNAL_API_KEY.padEnd(64, '\0'));
      
      isValid = crypto.timingSafeEqual(keyBuffer, expectedBuffer);
      
      metrics.increment('api_key.check.timing_safe');
    } catch (error) {
      // timingSafeEqual throws if buffers are different lengths (shouldn't happen with padding)
      logger.error('Timing-safe comparison failed', error instanceof Error ? error : undefined);
      isValid = false;
    }
  } else {
    // LEGACY: Simple comparison (timing attack vulnerable)
    isValid = apiKey === INTERNAL_API_KEY;
    metrics.increment('api_key.check.legacy');
  }
  
  if (!isValid) {
    recordFailedAttempt(ip);
    logger.security('Invalid API key attempt', {
      operation: 'api_key.validation',
      ip,
    });
  } else {
    metrics.increment('api_key.success');
  }
  
  return isValid;
}

// Clerk middleware with conditional protection
const clerkProtection = clerkMiddleware(async (auth, req) => {
  // Skip Clerk protection if valid API key is present
  if (hasValidApiKey(req)) {
    return NextResponse.next();
  }

  // Protect routes using Clerk's built-in protection
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// Main middleware - check API key first, then Clerk
export default async function middleware(req: NextRequest) {
  // CSRF Protection: Verify Origin header for state-changing requests
  const method = req.method;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    
    // Allow requests from same origin or if no origin header (native apps, curl, etc.)
    // Skip CSRF for webhooks (they use HMAC signatures)
    if (origin && host && !req.url.includes('/api/webhooks/') && !req.url.includes('/api/cron/')) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        logger.security('CSRF attempt detected', {
          operation: 'csrf.check',
          origin,
          host,
          method,
          url: req.url,
        });
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    }
  }
  
  // Fast path: if valid API key, bypass Clerk entirely
  if (hasValidApiKey(req)) {
    return NextResponse.next();
  }

  // Otherwise, use Clerk middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clerkProtection(req, {} as any);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
