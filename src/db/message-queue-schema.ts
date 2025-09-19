import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uuid,
} from "drizzle-orm/pg-core";

export const messageQueue = pgTable(
  "message_queue",
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: text('patient_id').notNull(),
    phoneNumber: text('phone_number').notNull(),
    message: text('message').notNull(),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
    messageType: text('message_type', { enum: ['verification', 'reminder', 'confirmation', 'general', 'emergency'] }).notNull().default('general'),
    conversationId: text('conversation_id'),
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(3),
    priorityScore: integer('priority_score').notNull().default(3), // Lower = higher priority
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    lastError: text('last_error'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index('message_queue_status_idx').on(table.status),
    priorityIdx: index('message_queue_priority_idx').on(table.priorityScore),
    patientIdx: index('message_queue_patient_idx').on(table.patientId),
    createdAtIdx: index('message_queue_created_at_idx').on(table.createdAt),
    statusPriorityIdx: index('message_queue_status_priority_idx').on(table.status, table.priorityScore),
  })
)

export const messageQueueStats = pgTable(
  "message_queue_stats",
  {
    id: uuid('id').defaultRandom().primaryKey(),
    totalProcessed: integer('total_processed').notNull().default(0),
    totalFailed: integer('total_failed').notNull().default(0),
    averageProcessingTime: integer('average_processing_time').notNull().default(0), // in milliseconds
    lastResetAt: timestamp('last_reset_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
)

// Types for the new tables
export type MessageQueue = typeof messageQueue.$inferSelect
export type NewMessageQueue = typeof messageQueue.$inferInsert
export type MessageQueueStats = typeof messageQueueStats.$inferSelect
export type NewMessageQueueStats = typeof messageQueueStats.$inferInsert