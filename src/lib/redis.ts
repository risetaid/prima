import Redis, { Cluster } from 'ioredis'
import { logger } from './logger'

class RedisClient {
  private client: Redis | Cluster | null = null
  private isConnecting: boolean = false
  private isCluster: boolean = false

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
      const redisUrl = process.env.REDIS_URL || process.env.KV_URL || ''
      const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',').filter(Boolean)

      // Check if cluster mode is enabled
      this.isCluster = !!(clusterNodes && clusterNodes.length > 0) || process.env.REDIS_CLUSTER === 'true'

      if (this.isCluster && clusterNodes) {
        // Redis Cluster configuration
        const nodes = clusterNodes.map(node => {
          const [host, port] = node.split(':')
          return { host: host || 'localhost', port: parseInt(port || '6379', 10) }
        })

        this.client = new Cluster(nodes, {
          // Cluster-specific optimizations
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            family: 4,
            keepAlive: 30000, // 30 seconds
            connectTimeout: 10000,
            commandTimeout: 5000,
            maxRetriesPerRequest: 3,
            enableReadyCheck: false,
            lazyConnect: true,
          },
          maxRedirections: 16,
          retryDelayOnClusterDown: 100,
          enableOfflineQueue: true,
          // Connection pooling for cluster
          scaleReads: 'slave',
        })

        logger.info('Initializing Redis Cluster', {
          redis: true,
          nodes: nodes.length,
          cluster: true
        })
      } else {
        // Single Redis instance with enhanced connection pooling
        this.client = new Redis(redisUrl, {
          // Enhanced IORedis optimizations for medical system
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          commandTimeout: 5000,
          // Connection optimization
          lazyConnect: true,
          family: 4,
          keepAlive: 30000, // 30 seconds TCP keep-alive
          // Connection pooling settings
          connectionName: 'prima-redis-client',
          // Performance optimizations
          enableReadyCheck: false,
          autoResubscribe: true,
          autoResendUnfulfilledCommands: true,
          // Authentication if provided
          password: process.env.REDIS_PASSWORD,
          username: process.env.REDIS_USERNAME,
        })
      }

      this.client.on('error', (err: Error) => {
        logger.error(`${this.isCluster ? 'Redis Cluster' : 'IORedis'} Client Error`, err, {
          redis: true,
          connection: 'failed',
          cluster: this.isCluster
        })
        // Don't throw - gracefully degrade
        this.client = null
      })

      this.client.on('connect', () => {
        logger.info(`${this.isCluster ? 'Redis Cluster' : 'IORedis'} connected successfully`, {
          redis: true,
          connection: 'established',
          cluster: this.isCluster
        })
      })

      this.client.on('ready', () => {
        logger.info(`${this.isCluster ? 'Redis Cluster' : 'IORedis'} ready for commands`, {
          redis: true,
          status: 'ready',
          cluster: this.isCluster
        })
      })

      // Test connection
      await this.client.ping()
    } catch (error) {
      logger.error('Failed to initialize IORedis', error instanceof Error ? error : new Error(String(error)), {
        redis: true,
        initialization: 'failed'
      })
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
      logger.warn('IORedis GET failed', {
        redis: true,
        operation: 'get',
        error: error instanceof Error ? error.message : String(error)
      })
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
      logger.warn('IORedis SET failed', {
        redis: true,
        operation: 'set',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      logger.warn('IORedis DEL failed', {
        redis: true,
        operation: 'del',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.warn('IORedis EXISTS failed', {
        redis: true,
        operation: 'exists',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async info(section?: string): Promise<string> {
    if (!this.client) throw new Error('Redis client not initialized')

    try {
      if (section) {
        return await this.client.info(section)
      } else {
        return await this.client.info()
      }
    } catch (error) {
      logger.warn('IORedis INFO failed', {
        redis: true,
        operation: 'info',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client) return false

    try {
      await this.client.expire(key, ttl)
      return true
    } catch (error) {
      logger.warn('IORedis EXPIRE failed', {
        redis: true,
        operation: 'expire',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async hset(key: string, field: string | Record<string, string>, value?: string): Promise<boolean> {
    if (!this.client) return false

    try {
      if (typeof field === 'string') {
        await this.client.hset(key, field, value || '')
      } else {
        await this.client.hset(key, field)
      }
      return true
    } catch (error) {
      logger.warn('IORedis HSET failed', {
        redis: true,
        operation: 'hset',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) return null

    try {
      return await this.client.hget(key, field)
    } catch (error) {
      logger.warn('IORedis HGET failed', {
        redis: true,
        operation: 'hget',
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) return {}

    try {
      return await this.client.hgetall(key)
    } catch (error) {
      logger.warn('IORedis HGETALL failed', {
        redis: true,
        operation: 'hgetall',
        error: error instanceof Error ? error.message : String(error)
      })
      return {}
    }
  }

  // For health checks
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready'
  }

  // Check if using cluster mode
  isClusterMode(): boolean {
    return this.isCluster
  }
}

// Export singleton instance
export const redis = new RedisClient()

