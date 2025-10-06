import Redis, { Cluster } from 'ioredis'
import { logger } from '@/lib/logger'
import { getCircuitBreaker } from '@/lib/circuit-breaker'

class RedisClient {
  private client: Redis | Cluster | null = null
  private isConnecting: boolean = false
  private isCluster: boolean = false
  private lastConnectionErrorLog: number = 0
  private lastReconnectLog: number = 0
  private lastCloseLog: number = 0
  private circuitBreaker = getCircuitBreaker('redis', {
    failureThreshold: 5,    // Reduced from default to fail faster
    resetTimeout: 15000,    // Reduced to 15 seconds
    monitoringPeriod: 30000
  })

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
        // Single Redis instance with Railway Pro optimizations
        this.client = new Redis(redisUrl, {
          // Railway Pro: Enhanced retry strategy - FIXED to prevent infinite loops
          maxRetriesPerRequest: 2,     // Further reduced from 3 to 2
          connectTimeout: 8000,        // Reduced from 10s to 8s
          commandTimeout: 3000,        // Reduced from 5s to 3s
          retryStrategy: (times) => {
            // Exponential backoff with jitter but capped
            const delay = Math.min(times * 150 + Math.random() * 50, 1500) // Max 1.5s
            
            // Silent retry logging to reduce noise
            // Only log if exceeding threshold
            if (times > 3) {
              logger.warn(`Redis retry attempt ${times}, waiting ${Math.round(delay)}ms`, {
                redis: true,
                retry: times,
                delay: Math.round(delay)
              })
            }
            
            // Reduced max retries from 20 to 5 to prevent hanging
            if (times > 5) {
              logger.error('Redis max retries exceeded', new Error('Max retries'), {
                redis: true,
                retries: times
              })
              return null
            }
            return delay
          },
          
          // Connection resilience  
          lazyConnect: true,           // Use lazy connect for better error handling
          enableOfflineQueue: true,    // Queue commands when offline
          enableReadyCheck: false,     // Disable ready check to reduce overhead
          autoResubscribe: true,
          autoResendUnfulfilledCommands: true,
          
          // Railway Pro: Enhanced keepalive with shorter intervals
          family: 4,                   // IPv4 only for Railway
          keepAlive: 30000,            // 30 seconds TCP keep-alive (reduced from 60s)
          noDelay: true,               // Disable Nagle's algorithm for lower latency
          
          // Connection metadata
          connectionName: 'prima-railway-pro',
          
          // Authentication (parsed from Railway URL)
          password: process.env.REDIS_PASSWORD,
          username: process.env.REDIS_USERNAME || 'default',
          
          // Development debugging
          showFriendlyErrorStack: process.env.NODE_ENV === 'development',
          
          // Reconnect on error to handle ECONNRESET
          reconnectOnError: (err) => {
            const targetErrors = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE']
            if (targetErrors.includes(err.message)) {
              // Reconnect on connection errors
              return true
            }
            return false
          },
        })
      }

      this.client.on('error', (err: Error) => {
        const errorCode = (err as Error & { code?: string }).code
        
        // Only log connection errors once per minute to reduce noise
        const connectionErrors = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND']
        if (connectionErrors.includes(errorCode || '')) {
          // Suppress frequent connection reset logs
          if (!this.lastConnectionErrorLog || Date.now() - this.lastConnectionErrorLog > 60000) {
            logger.warn(`${this.isCluster ? 'Redis Cluster' : 'IORedis'} connection error (${errorCode}), retrying...`, {
              redis: true,
              cluster: this.isCluster,
              code: errorCode,
            })
            this.lastConnectionErrorLog = Date.now()
          }
        } else {
          // Log non-connection errors immediately
          logger.error(`${this.isCluster ? 'Redis Cluster' : 'IORedis'} Client Error`, err, {
            redis: true,
            connection: 'failed',
            cluster: this.isCluster,
            message: err.message,
            code: errorCode,
          })
        }
        // Don't set client to null - keep trying to reconnect
      })

      this.client.on('connect', () => {
        // Connection success - silent logging to reduce noise
      })

      this.client.on('ready', () => {
        // Ready for commands - silent logging to reduce noise
      })

      this.client.on('reconnecting', (time: number) => {
        // Only log reconnection attempts every 30 seconds to reduce noise
        if (!this.lastReconnectLog || Date.now() - this.lastReconnectLog > 30000) {
          logger.info('Redis reconnecting', {
            redis: true,
            reconnectDelay: time,
            cluster: this.isCluster
          })
          this.lastReconnectLog = Date.now()
        }
      })

      this.client.on('end', () => {
        // Silenced to reduce log noise - connection will retry automatically
      })

      this.client.on('close', () => {
        // Only log close events once per minute
        if (!this.lastCloseLog || Date.now() - this.lastCloseLog > 60000) {
          logger.warn('Redis connection closed', {
            redis: true,
            cluster: this.isCluster,
            status: 'reconnecting'
          })
          this.lastCloseLog = Date.now()
        }
      })

      // Connect (lazyConnect is true, so connect manually)
      if (!this.isCluster && this.client) {
        try {
          await this.client.connect()
          // Test connection with ping
          await this.client.ping()
          logger.info('Redis connection established successfully', {
            redis: true,
            connected: true
          })
        } catch (connectError) {
          logger.warn('Redis initial connection failed, will retry in background', {
            redis: true,
            error: connectError instanceof Error ? connectError.message : String(connectError),
            willRetry: true
          })
          // Don't throw - let it retry in background
        }
      }
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
    
    return await this.circuitBreaker.execute(async () => {
      if (!this.client) {
        throw new Error('Redis client not initialized')
      }
      try {
        return await this.client.get(key)
      } catch (error) {
        logger.warn('IORedis GET failed', {
          redis: true,
          operation: 'get',
          error: error instanceof Error ? error.message : String(error),
          circuitState: this.circuitBreaker.getState().state
        })
        throw error
      }
    }).catch((error) => {
      // Return null on circuit breaker open or other errors
      if (error.message.includes('Circuit breaker')) {
        logger.warn('Redis circuit breaker open, using fallback', {
          redis: true,
          operation: 'get',
          key
        })
        return null
      }
      return null
    })
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

  async hdel(key: string, ...fields: string[]): Promise<boolean> {
    if (!this.client) return false

    try {
      await this.client.hdel(key, ...fields)
      return true
    } catch (error) {
      logger.warn('IORedis HDEL failed', {
        redis: true,
        operation: 'hdel',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  // Sorted set operations for message queue
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.client) return false

    try {
      await this.client.zadd(key, score, member)
      return true
    } catch (error) {
      logger.warn('IORedis ZADD failed', {
        redis: true,
        operation: 'zadd',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return []

    try {
      return await this.client.zrange(key, start, stop)
    } catch (error) {
      logger.warn('IORedis ZRANGE failed', {
        redis: true,
        operation: 'zrange',
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    if (!this.client) return []

    try {
      return await this.client.zrangebyscore(key, min, max)
    } catch (error) {
      logger.warn('IORedis ZRANGEBYSCORE failed', {
        redis: true,
        operation: 'zrangebyscore',
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (!this.client) return 0

    try {
      return await this.client.zrem(key, ...members)
    } catch (error) {
      logger.warn('IORedis ZREM failed', {
        redis: true,
        operation: 'zrem',
        error: error instanceof Error ? error.message : String(error)
      })
      return 0
    }
  }

  async zcard(key: string): Promise<number> {
    if (!this.client) return 0

    try {
      return await this.client.zcard(key)
    } catch (error) {
      logger.warn('IORedis ZCARD failed', {
        redis: true,
        operation: 'zcard',
        error: error instanceof Error ? error.message : String(error)
      })
      return 0
    }
  }

  // For health checks
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready'
  }

  // Get connection status details
  getStatus(): { 
    connected: boolean; 
    status: string; 
    cluster: boolean;
    circuitBreaker?: ReturnType<typeof RedisClient.prototype.circuitBreaker.getState>;
  } {
    return {
      connected: this.isConnected(),
      status: this.client?.status || 'disconnected',
      cluster: this.isCluster,
      circuitBreaker: this.circuitBreaker.getState()
    }
  }

  // Ping with latency measurement
  async ping(): Promise<{ success: boolean; latency: number }> {
    const start = Date.now()
    try {
      if (!this.client) return { success: false, latency: 0 }
      await this.client.ping()
      return { success: true, latency: Date.now() - start }
    } catch {
      return { success: false, latency: Date.now() - start }
    }
  }

  // Get keys matching pattern (use with caution in production)
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return []
    
    try {
      return await this.client.keys(pattern)
    } catch (error) {
      logger.warn('IORedis KEYS failed', {
        redis: true,
        operation: 'keys',
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  // Check if using cluster mode
  isClusterMode(): boolean {
    return this.isCluster
  }
}

// Export singleton instance
export const redis = new RedisClient()

