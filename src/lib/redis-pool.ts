/**
 * Redis Connection Pool for PRIMA
 *
 * Provides shared Redis connections for both rate limiting and BullMQ.
 * Uses ioredis with connection pooling pattern via singleton management.
 *
 * Usage:
 * - Rate limiter: Uses the singleton from redis.ts
 * - BullMQ: Uses dedicated connections from this pool (BullMQ requirement)
 *
 * BullMQ requires separate connections for Queue, Worker, and Scheduler.
 * This module manages those connections centrally.
 */

// Server-only module - uses ioredis which requires Node.js built-ins (dns, fs, net, tls)
import "server-only";

import IORedis, { RedisOptions } from 'ioredis';
import { logger } from '@/lib/logger';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
  maxRetriesPerRequest: 3,
  // BullMQ requires enableReadyCheck: false for reliability
  enableReadyCheck: false,
  // Connection resilience
  lazyConnect: true,
  enableOfflineQueue: true,
  // Keepalive for Railway/cloud environments
  family: 4,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Parse REDIS_URL if provided (takes precedence over individual settings)
function getRedisConfig(): RedisOptions {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

  if (redisUrl) {
    return {
      ...REDIS_CONFIG,
      // URL parsing is handled by IORedis constructor
    };
  }

  return REDIS_CONFIG;
}

// Connection pool management
const connectionPool = new Map<string, IORedis>();

/**
 * Creates or retrieves a named Redis connection from the pool.
 * Each BullMQ component (Queue, Worker, Scheduler) needs its own connection.
 *
 * @param name - Unique identifier for this connection (e.g., 'bullmq-queue', 'bullmq-worker')
 * @returns IORedis connection instance
 */
export function getPooledConnection(name: string): IORedis {
  const existing = connectionPool.get(name);
  if (existing && existing.status !== 'end') {
    return existing;
  }

  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  let connection: IORedis;

  if (redisUrl) {
    connection = new IORedis(redisUrl, {
      ...getRedisConfig(),
      connectionName: `prima-${name}`,
    });
  } else {
    connection = new IORedis({
      ...getRedisConfig(),
      connectionName: `prima-${name}`,
    });
  }

  // Error handling
  connection.on('error', (err) => {
    logger.warn(`Redis pool connection error [${name}]`, {
      redis: true,
      pool: name,
      error: err.message,
    });
  });

  connection.on('connect', () => {
    logger.debug(`Redis pool connection established [${name}]`, {
      redis: true,
      pool: name,
    });
  });

  connection.on('close', () => {
    logger.debug(`Redis pool connection closed [${name}]`, {
      redis: true,
      pool: name,
    });
  });

  connectionPool.set(name, connection);
  return connection;
}

/**
 * Get a connection specifically for BullMQ Queue instances.
 * Each Queue should have its own connection.
 */
export function getBullMQQueueConnection(queueName: string): IORedis {
  return getPooledConnection(`bullmq-queue-${queueName}`);
}

/**
 * Get a connection specifically for BullMQ Worker instances.
 * Each Worker should have its own connection.
 */
export function getBullMQWorkerConnection(queueName: string): IORedis {
  return getPooledConnection(`bullmq-worker-${queueName}`);
}

/**
 * Get a connection specifically for BullMQ Scheduler instances.
 * Each Scheduler should have its own connection.
 */
export function getBullMQSchedulerConnection(queueName: string): IORedis {
  return getPooledConnection(`bullmq-scheduler-${queueName}`);
}

/**
 * Close all pooled connections gracefully.
 * Call this during application shutdown.
 */
export async function closeAllConnections(): Promise<void> {
  logger.info('Closing all Redis pool connections', {
    redis: true,
    poolSize: connectionPool.size,
  });

  const closePromises = Array.from(connectionPool.entries()).map(
    async ([name, connection]) => {
      try {
        await connection.quit();
        logger.debug(`Closed Redis connection [${name}]`, { redis: true });
      } catch (error) {
        logger.warn(`Error closing Redis connection [${name}]`, {
          redis: true,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  await Promise.all(closePromises);
  connectionPool.clear();
}

/**
 * Get pool statistics for monitoring.
 */
export function getPoolStats(): { name: string; status: string }[] {
  return Array.from(connectionPool.entries()).map(([name, connection]) => ({
    name,
    status: connection.status,
  }));
}

// Export types for consumers
export type { Redis as RedisConnection } from 'ioredis';
