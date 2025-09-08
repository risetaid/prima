import Redis from 'ioredis'

class RedisClient {
  private client: Redis | null = null
  private isConnecting: boolean = false

  constructor() {
    // Only initialize Redis if URL is available
    if (process.env.REDIS_URL || process.env.KV_URL) {
      this.initializeClient()
    }
  }

  private async initializeClient() {
    if (this.client || this.isConnecting) return
    
    this.isConnecting = true
    
    try {
      this.client = new Redis(process.env.REDIS_URL || process.env.KV_URL || '', {
        // IORedis optimizations for medical system
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Graceful degradation
        lazyConnect: true,
        // Connection pool settings
        family: 4,
      })

      this.client.on('error', (err: Error) => {
        console.warn('IORedis Client Error:', err)
        // Don't throw - gracefully degrade
        this.client = null
      })

      this.client.on('connect', () => {
        console.log('IORedis connected successfully')
      })

      this.client.on('ready', () => {
        console.log('IORedis ready for commands')
      })

      // Test connection
      await this.client.ping()
    } catch (error) {
      console.warn('Failed to initialize IORedis:', error)
      this.client = null
    } finally {
      this.isConnecting = false
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null
    
    try {
      return await this.client.get(key)
    } catch (error) {
      console.warn('IORedis GET failed:', error)
      return null
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) return false
    
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
      return true
    } catch (error) {
      console.warn('IORedis SET failed:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.warn('IORedis DEL failed:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.warn('IORedis EXISTS failed:', error)
      return false
    }
  }

  // For health checks
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready'
  }
}

// Export singleton instance
export const redis = new RedisClient()