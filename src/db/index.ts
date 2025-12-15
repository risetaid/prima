import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { featureFlags } from '@/lib/feature-flags'
import { logger } from '@/lib/logger'

// Railway Pro PostgreSQL - Connection Pool Configuration
// Railway Pro Plan supports up to 20 concurrent connections

// Determine pool configuration based on feature flag
const useOptimizedPool = featureFlags.isEnabled('PERF_OPTIMIZED_POOL');

const poolConfig = useOptimizedPool ? {
  // OPTIMIZED: Leave headroom for admin operations and monitoring
  max: 15,                     // Leave 5 connections for safety margin
  idle_timeout: 120,           // 2 minutes - reduce connection churn
  max_lifetime: 60 * 30,       // 30 minutes
  connect_timeout: 10,         // 10 seconds
  keep_alive: 60,              // TCP keepalive every 60 seconds
  statement_timeout: 15000,    // 15s for API routes - fail fast
} : {
  // LEGACY: Uses all available connections
  max: 20,                     // Railway Pro supports up to 20 connections
  idle_timeout: 20,            // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,       // Connection lifetime: 30 minutes
  connect_timeout: 10,         // Connection timeout: 10 seconds
  keep_alive: 60,              // TCP keepalive every 60 seconds
  statement_timeout: 30000,    // 30s query timeout
};

logger.info('Database connection pool initialized', {
  operation: 'db.init',
  config: useOptimizedPool ? 'optimized' : 'legacy',
  max_connections: poolConfig.max,
  statement_timeout_ms: poolConfig.statement_timeout,
});

const client = postgres(process.env.DATABASE_URL!, {
  ...poolConfig,
  
  // Connection configuration
  connection: {
    application_name: 'prima_nextjs',  // Identify in pg_stat_activity
    statement_timeout: poolConfig.statement_timeout,
  },
  
  // Data transformation
  transform: {
    undefined: null,           // Transform undefined to null
  },
  
  // Logging
  onnotice: () => {},          // Disable notices for cleaner logs
  debug: undefined,            // Disable SQL query logging for cleaner output
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from '@/db/schema'

