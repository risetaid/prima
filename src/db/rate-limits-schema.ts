import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rateLimitKey: text('rate_limit_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rateLimitKeyIdx: index('rate_limits_rate_limit_key_idx').on(table.rateLimitKey),
    createdAtIdx: index('rate_limits_created_at_idx').on(table.createdAt),
    rateLimitKeyCreatedAtIdx: index('rate_limits_key_created_at_idx').on(table.rateLimitKey, table.createdAt),
  })
)

// Types for the new table
export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert