import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

// Railway Pro PostgreSQL - Optimized Connection Pool
// Railway Pro Plan supports up to 20 concurrent connections
const client = postgres(process.env.DATABASE_URL!, {
  // Railway Pro: Optimal connection pool
  max: 20,                     // Railway Pro supports up to 20 connections
  idle_timeout: 20,            // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,       // Connection lifetime: 30 minutes
  connect_timeout: 10,         // Connection timeout: 10 seconds
  
  // Railway Pro: TCP keepalive
  keep_alive: true,            // Enable TCP keepalive
  
  // Connection configuration
  connection: {
    application_name: 'prima_nextjs',  // Identify in pg_stat_activity
    statement_timeout: 30000,          // 30s query timeout
  },
  
  // Data transformation
  transform: {
    undefined: null,           // Transform undefined to null
  },
  
  // Logging
  onnotice: () => {},          // Disable notices for cleaner logs
  debug: process.env.NODE_ENV === 'development' ? console.log : undefined,
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from '@/db/schema'

