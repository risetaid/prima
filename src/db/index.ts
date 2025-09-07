import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Use pooled connection (DATABASE_URL) for regular operations
// This uses pgbouncer connection pooling which is more efficient for serverless
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,              // Required for pgbouncer compatibility
  max: 15,                     // Increased max connections for better concurrency
  idle_timeout: 30,            // Longer idle timeout for pooled connections
  connect_timeout: 5,          // Reduced connect timeout for faster failures
  transform: {
    undefined: null,          // Transform undefined to null
  },
  onnotice: () => {},         // Disable notices for cleaner logs
  ssl: {
    rejectUnauthorized: false // For Supabase SSL
  }
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from './schema'