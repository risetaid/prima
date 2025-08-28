// Simple in-memory rate limiter for WhatsApp API calls
interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number = 60, windowMs: number = 60000) { // 60 requests per minute default
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return true
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return false
    }

    // Increment counter
    entry.count++
    return true
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests
    }
    return Math.max(0, this.maxRequests - entry.count)
  }

  getResetTime(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs
    }
    return entry.resetTime
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Export singleton instance for WhatsApp rate limiting
export const whatsappRateLimiter = new RateLimiter(50, 60000) // 50 messages per minute