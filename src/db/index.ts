import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Optimized connection settings for Supabase with aggressive timeouts
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,
  max: 5,                     // Reduced max connections for better reliability
  idle_timeout: 10,           // Reduced idle timeout to 10 seconds
  connect_timeout: 5,         // Reduced connect timeout to 5 seconds
  // statement_timeout: 15000,   // 15 second statement timeout (not supported in this postgres client)
  // query_timeout: 10000,       // 10 second query timeout (not supported in this postgres client)
  transform: {
    undefined: null,          // Transform undefined to null
  },
  onnotice: () => {},         // Disable notices for cleaner logs
  ssl: {
    rejectUnauthorized: false // For Supabase SSL issues
  }
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from './schema'