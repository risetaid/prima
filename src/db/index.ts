import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Use pooled connection (DATABASE_URL) for regular operations
// This uses pgbouncer connection pooling which is more efficient for serverless
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,              // Required for pgbouncer compatibility
  max: 10,                     // Increase max connections for pooled setup
  idle_timeout: 20,            // Longer idle timeout for pooled connections
  connect_timeout: 10,         // Connect timeout
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