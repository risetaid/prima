import { RateLimiter, getClientIP, getUserIdentifier, API_RATE_LIMITS } from '../lib/rate-limiter'
import { redis } from '../lib/redis'

// Mock Redis
jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
  }
}))

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      // No existing data (first request)
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.checkRateLimit('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // 100 - 1
      expect(result.totalRequests).toBe(1)
    })

    it('should block requests over limit', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      // Mock existing data with 100 requests
      const existingData = {
        requests: Array(100).fill(Date.now()),
        windowStart: Date.now()
      }
      mockGet.mockResolvedValue(JSON.stringify(existingData))
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.checkRateLimit('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.totalRequests).toBe(100)
    })

    it('should clean old requests outside window', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)

      // Mock data with some old requests
      const existingData = {
        requests: [
          oneHourAgo, // Old request (outside window)
          now - 1000, // Recent request
          now // Current request
        ],
        windowStart: oneHourAgo
      }

      mockGet.mockResolvedValue(JSON.stringify(existingData))
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.checkRateLimit('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(true)
      expect(result.totalRequests).toBe(2) // Only recent requests count
    })

    it('should handle Redis errors gracefully', async () => {
      const mockGet = redis.get as jest.Mock

      mockGet.mockRejectedValue(new Error('Redis connection failed'))

      const result = await RateLimiter.checkRateLimit('user:123', API_RATE_LIMITS.GENERAL)

      // Should allow request on Redis error
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(100)
      expect(result.totalRequests).toBe(0)
    })

    it('should handle invalid stored data', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      // Invalid JSON data
      mockGet.mockResolvedValue('invalid json')
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.checkRateLimit('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(true)
      expect(result.totalRequests).toBe(1)
    })
  })

  describe('rateLimitMiddleware', () => {
    it('should return success response for allowed requests', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.rateLimitMiddleware('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(true)
      expect(result.headers).toBeDefined()
      expect(result.headers?.['X-RateLimit-Limit']).toBe('100')
      expect(result.headers?.['X-RateLimit-Remaining']).toBe('99')
    })

    it('should return rate limit response for blocked requests', async () => {
      const mockGet = redis.get as jest.Mock
      const mockSet = redis.set as jest.Mock

      const existingData = {
        requests: Array(100).fill(Date.now()),
        windowStart: Date.now()
      }
      mockGet.mockResolvedValue(JSON.stringify(existingData))
      mockSet.mockResolvedValue(true)

      const result = await RateLimiter.rateLimitMiddleware('user:123', API_RATE_LIMITS.GENERAL)

      expect(result.allowed).toBe(false)
      expect(result.headers).toBeDefined()
      expect(result.headers?.['X-RateLimit-Limit']).toBe('100')
      expect(result.headers?.['X-RateLimit-Remaining']).toBe('0')
      expect(result.headers?.['Retry-After']).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('should cleanup specific identifier', async () => {
      const mockExists = redis.exists as jest.Mock
      const mockDel = redis.del as jest.Mock

      mockExists.mockResolvedValue(true)
      mockDel.mockResolvedValue(true)

      await RateLimiter.cleanup('user:123')

      expect(mockExists).toHaveBeenCalledWith('ratelimit:user:123')
      expect(mockDel).toHaveBeenCalledWith('ratelimit:user:123')
    })

    it('should handle non-existent keys', async () => {
      const mockExists = redis.exists as jest.Mock

      mockExists.mockResolvedValue(false)

      await expect(RateLimiter.cleanup('user:123')).resolves.not.toThrow()
    })
  })

  describe('getStats', () => {
    it('should return stats for specific identifier', async () => {
      const mockExists = redis.exists as jest.Mock
      const mockGet = redis.get as jest.Mock

      const mockData = {
        requests: [Date.now(), Date.now()],
        windowStart: Date.now()
      }

      mockExists.mockResolvedValue(true)
      mockGet.mockResolvedValue(JSON.stringify(mockData))

      const stats = await RateLimiter.getStats('user:123')

      expect(stats.totalKeys).toBe(1)
      expect(stats.activeKeys).toBe(1)
      expect(stats.totalRequests).toBe(2)
      expect(stats.averageRequestsPerKey).toBe(2)
    })

    it('should handle invalid data gracefully', async () => {
      const mockExists = redis.exists as jest.Mock
      const mockGet = redis.get as jest.Mock

      mockExists.mockResolvedValue(true)
      mockGet.mockResolvedValue('invalid json')

      const stats = await RateLimiter.getStats('user:123')

      expect(stats.totalKeys).toBe(0)
      expect(stats.activeKeys).toBe(0)
      expect(stats.totalRequests).toBe(0)
      expect(stats.averageRequestsPerKey).toBe(0)
    })
  })
})

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '192.168.1.100, 10.0.0.1'
      })
    } as Request

    const ip = getClientIP(mockRequest)
    expect(ip).toBe('192.168.1.100')
  })

  it('should extract IP from x-real-ip header', () => {
    const mockRequest = {
      headers: new Headers({
        'x-real-ip': '192.168.1.100'
      })
    } as Request

    const ip = getClientIP(mockRequest)
    expect(ip).toBe('192.168.1.100')
  })

  it('should return unknown for missing IP headers', () => {
    const mockRequest = {
      headers: new Headers()
    } as Request

    const ip = getClientIP(mockRequest)
    expect(ip).toBe('unknown')
  })
})

describe('getUserIdentifier', () => {
  it('should prefer user ID over IP', () => {
    const mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '192.168.1.100'
      })
    } as Request

    const identifier = getUserIdentifier(mockRequest, 'user-123')
    expect(identifier).toBe('user:user-123')
  })

  it('should use IP when no user ID provided', () => {
    const mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '192.168.1.100'
      })
    } as Request

    const identifier = getUserIdentifier(mockRequest)
    expect(identifier).toBe('ip:192.168.1.100')
  })

  it('should handle null user ID', () => {
    const mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '192.168.1.100'
      })
    } as Request

    const identifier = getUserIdentifier(mockRequest, null as any)
    expect(identifier).toBe('ip:192.168.1.100')
  })
})

describe('API_RATE_LIMITS', () => {
  it('should have correct rate limit configurations', () => {
    expect(API_RATE_LIMITS.GENERAL.maxRequests).toBe(100)
    expect(API_RATE_LIMITS.GENERAL.windowMs).toBe(15 * 60 * 1000) // 15 minutes

    expect(API_RATE_LIMITS.AUTH.maxRequests).toBe(5)
    expect(API_RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000)

    expect(API_RATE_LIMITS.UPLOAD.maxRequests).toBe(10)
    expect(API_RATE_LIMITS.UPLOAD.windowMs).toBe(60 * 60 * 1000) // 1 hour

    expect(API_RATE_LIMITS.WHATSAPP.maxRequests).toBe(50)
    expect(API_RATE_LIMITS.WHATSAPP.windowMs).toBe(60 * 60 * 1000)

    expect(API_RATE_LIMITS.ADMIN.maxRequests).toBe(200)
    expect(API_RATE_LIMITS.ADMIN.windowMs).toBe(15 * 60 * 1000)
  })
})