import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,
  max: 1 
})

export const db = drizzle(client, { schema })

// Export types for convenience
export type DB = typeof db
export * from './schema'