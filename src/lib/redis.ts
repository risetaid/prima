import { createClient, RedisClientType } from 'redis'

class RedisClient {
  private client: RedisClientType | null = null
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
      this.client = createClient({
        url: process.env.REDIS_URL || process.env.KV_URL,
      })

      this.client.on('error', (err: Error) => {
        console.warn('Redis Client Error:', err)
        // Don't throw - gracefully degrade
        this.client = null
      })

      this.client.on('connect', () => {
        console.log('Redis connected successfully')
      })

      await this.client.connect()
    } catch (error) {
      console.warn('Failed to initialize Redis:', error)
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
      console.warn('Redis GET failed:', error)
      return null
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) return false
    
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
      return true
    } catch (error) {
      console.warn('Redis SET failed:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.warn('Redis DEL failed:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.warn('Redis EXISTS failed:', error)
      return false
    }
  }

  // For health checks
  isConnected(): boolean {
    return this.client !== null && this.client.isReady
  }
}

// Export singleton instance
export const redis = new RedisClient()