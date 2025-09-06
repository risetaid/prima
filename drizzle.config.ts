import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DIRECT_URL for migrations to avoid pgbouncer issues
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config