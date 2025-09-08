import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Railway PostgreSQL - Single Direct Connection (No Pooling Issues)
// Unlike Supabase, Railway provides direct PostgreSQL access
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,                      // Railway: Use single connection to avoid conflicts
  idle_timeout: 0,             // Railway: Disable idle timeout  
  connect_timeout: 10,         // Railway: Standard connection timeout
  transform: {
    undefined: null,           // Transform undefined to null
  },
  onnotice: () => {},          // Disable notices for cleaner logs
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from './schema'