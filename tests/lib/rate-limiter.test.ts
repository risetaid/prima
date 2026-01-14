/**
 * Rate Limiter Tests
 *
 * Tests for the sliding window rate limiter using Redis sorted sets.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { RateLimiter, API_RATE_LIMITS } from '@/lib/rate-limiter';

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    zadd: vi.fn().mockResolvedValue(1),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    zcard: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
  },
}));

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(5);
      (redis.redis.zadd as Mock).mockResolvedValue(1);

      const result = await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.totalRequests).toBe(5);
    });

    it('should deny requests exceeding limit', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(10);

      const result = await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should calculate reset time correctly', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(1);

      const now = Date.now();
      const result = await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.resetTime).toBeGreaterThanOrEqual(now + 60000);
    });

    it('should remove old entries outside window', async () => {
      const redis = await import('@/lib/redis');

      await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(redis.redis.zremrangebyscore).toHaveBeenCalled();
    });

    it('should add new request with timestamp', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(1);

      await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(redis.redis.zadd).toHaveBeenCalled();
    });

    it('should set expiration on key', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(1);

      await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      // 60s window + 60s buffer = 120s expiration
      expect(redis.redis.expire).toHaveBeenCalledWith(
        expect.any(String),
        120
      );
    });
  });

  describe('checkSlidingWindow', () => {
    it('should be an alias for checkRateLimit', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(5);

      const result1 = await RateLimiter.checkRateLimit('test', { windowMs: 60000, maxRequests: 10 });
      const result2 = await RateLimiter.checkSlidingWindow('test', { windowMs: 60000, maxRequests: 10 });

      expect(result1).toEqual(result2);
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should return allowed=true and headers when under limit', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(5);

      const result = await RateLimiter.rateLimitMiddleware('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.headers).toBeDefined();
      expect(result.headers!['X-RateLimit-Limit']).toBe('10');
      expect(result.headers!['X-RateLimit-Remaining']).toBe('5');
    });

    it('should return allowed=false with Retry-After when over limit', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zcard as Mock).mockResolvedValue(10);

      const result = await RateLimiter.rateLimitMiddleware('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(false);
      expect(result.headers!['Retry-After']).toBeDefined();
    });
  });

  describe('Pre-configured Rate Limits', () => {
    it('should have GENERAL rate limit defined', () => {
      expect(API_RATE_LIMITS.GENERAL.windowMs).toBe(15 * 60 * 1000);
      expect(API_RATE_LIMITS.GENERAL.maxRequests).toBe(100);
    });

    it('should have AUTH rate limit defined', () => {
      expect(API_RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000);
      expect(API_RATE_LIMITS.AUTH.maxRequests).toBe(5);
    });

    it('should have WHATSAPP rate limit defined', () => {
      expect(API_RATE_LIMITS.WHATSAPP.windowMs).toBe(60 * 60 * 1000);
      expect(API_RATE_LIMITS.WHATSAPP.maxRequests).toBe(50);
    });

    it('should have ADMIN rate limit defined', () => {
      expect(API_RATE_LIMITS.ADMIN.windowMs).toBe(15 * 60 * 1000);
      expect(API_RATE_LIMITS.ADMIN.maxRequests).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should allow requests on Redis error (fail-open)', async () => {
      const redis = await import('@/lib/redis');
      (redis.redis.zadd as Mock).mockRejectedValue(new Error('Redis connection failed'));

      const result = await RateLimiter.checkRateLimit('test-user', {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });
});

describe('Client IP Detection', () => {
  it('should extract first IP from x-forwarded-for', () => {
    const request = new Request('http://test.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getClientIP } = require('@/lib/rate-limiter');
    const ip = getClientIP(request);

    expect(ip).toBe('192.168.1.1');
  });

  it('should use x-real-ip header', () => {
    const request = new Request('http://test.com', {
      headers: {
        'x-real-ip': '192.168.1.100',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getClientIP } = require('@/lib/rate-limiter');
    const ip = getClientIP(request);

    expect(ip).toBe('192.168.1.100');
  });

  it('should return unknown for missing headers', () => {
    const request = new Request('http://test.com');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getClientIP } = require('@/lib/rate-limiter');
    const ip = getClientIP(request);

    expect(ip).toBe('unknown');
  });
});

describe('User Identifier', () => {
  it('should include user ID when provided', () => {
    const request = new Request('http://test.com');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getUserIdentifier } = require('@/lib/rate-limiter');
    const identifier = getUserIdentifier(request, 'user-123');

    expect(identifier).toBe('user:user-123');
  });

  it('should fall back to IP when no user ID', () => {
    const request = new Request('http://test.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getUserIdentifier } = require('@/lib/rate-limiter');
    const identifier = getUserIdentifier(request, null);

    expect(identifier).toBe('ip:192.168.1.1');
  });
});
