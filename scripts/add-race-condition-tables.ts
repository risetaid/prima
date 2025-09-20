/**
 * Migration script to add tables for race condition protection
 * Run this with: bun run scripts/add-race-condition-tables.ts
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

async function createDistributedLocksTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS distributed_locks (
        lock_key TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS distributed_locks_expires_at_idx
      ON distributed_locks(expires_at)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS distributed_locks_created_at_idx
      ON distributed_locks(created_at)
    `);

    logger.info('✅ Distributed locks table created successfully');
  } catch (error) {
    logger.error('Failed to create distributed locks table', error as Error);
    throw error;
  }
}

async function createRateLimitsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        rate_limit_key TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS rate_limits_rate_limit_key_idx
      ON rate_limits(rate_limit_key)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS rate_limits_created_at_idx
      ON rate_limits(created_at)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS rate_limits_key_created_at_idx
      ON rate_limits(rate_limit_key, created_at)
    `);

    logger.info('✅ Rate limits table created successfully');
  } catch (error) {
    logger.error('Failed to create rate limits table', error as Error);
    throw error;
  }
}

async function addMissingColumnsToReminders() {
  try {
    // Add confirmationStatus column if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reminders' AND column_name = 'confirmation_status'
        ) THEN
          ALTER TABLE reminders ADD COLUMN confirmation_status TEXT DEFAULT 'PENDING';
        END IF;
      END $$;
    `);

    logger.info('✅ Missing confirmation_status column added to reminders table');
  } catch (error) {
    logger.error('Failed to add missing columns to reminders table', error as Error);
    throw error;
  }
}

async function runMigration() {
  logger.info('🚀 Starting race condition protection migration...');

  try {
    await createDistributedLocksTable();
    await createRateLimitsTable();
    await addMissingColumnsToReminders();

    logger.info('🎉 Race condition protection migration completed successfully!');

    logger.info('\n=== Migration Summary ===');
    logger.info('✅ Distributed locks table created');
    logger.info('✅ Rate limits table created');
    logger.info('✅ Missing columns added to reminders table');
    logger.info('\nNext steps:');
    logger.info('1. Run: bun run db:generate');
    logger.info('2. Test the race condition protection features');
    logger.info('3. Monitor logs for race condition warnings');

  } catch (error) {
    logger.error('❌ Migration failed', error as Error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch((error) => {
    logger.error('Migration script failed', error);
    process.exit(1);
  });
}

export { runMigration };