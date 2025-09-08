import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Railway PostgreSQL - use DATABASE_URL (no pooling issues like Supabase)
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config