import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const distributedLocks = pgTable(
  "distributed_locks",
  {
    lockKey: text('lock_key').notNull().primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    expiresAtIdx: index('distributed_locks_expires_at_idx').on(table.expiresAt),
    createdAtIdx: index('distributed_locks_created_at_idx').on(table.createdAt),
  })
)

// Types for the new table
export type DistributedLock = typeof distributedLocks.$inferSelect
export type NewDistributedLock = typeof distributedLocks.$inferInsert