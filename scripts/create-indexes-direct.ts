#!/usr/bin/env bun
/**
 * Create indexes directly (simple approach)
 * Usage: bun scripts/create-indexes-direct.ts --confirm
 */

import postgres from 'postgres';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log('\n=== Creating Database Indexes ===\n', colors.cyan);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL not found!', colors.red);
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('railway') ? 'require' : false,
  });

  const autoConfirm = process.argv.includes('--confirm');
  if (!autoConfirm) {
    log('⚠️  Dry run mode: Add --confirm flag to create indexes', colors.yellow);
    log('Example: bun scripts/create-indexes-direct.ts --confirm\n', colors.cyan);
    await sql.end();
    process.exit(0);
  }

  try {
    // Index 1: conversation_messages
    log('📊 Creating index 1/2: conversation_messages_state_created_idx', colors.cyan);
    log('⏳ This may take several minutes...', colors.yellow);
    const start1 = Date.now();

    try {
      await sql.unsafe(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS conversation_messages_state_created_idx
        ON conversation_messages USING btree (conversation_state_id, created_at)
      `);
      const duration1 = ((Date.now() - start1) / 1000).toFixed(2);
      log(`✅ Index 1 created successfully in ${duration1}s\n`, colors.green);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        log('✅ Index 1 already exists\n', colors.green);
      } else {
        throw error;
      }
    }

    // Index 2: conversation_states
    log('📊 Creating index 2/2: conversation_states_patient_active_expires_idx', colors.cyan);
    log('⏳ This may take several minutes...', colors.yellow);
    const start2 = Date.now();

    try {
      await sql.unsafe(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS conversation_states_patient_active_expires_idx
        ON conversation_states USING btree (patient_id, is_active, expires_at)
      `);
      const duration2 = ((Date.now() - start2) / 1000).toFixed(2);
      log(`✅ Index 2 created successfully in ${duration2}s\n`, colors.green);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        log('✅ Index 2 already exists\n', colors.green);
      } else {
        throw error;
      }
    }

    log('✨ All indexes created successfully!\n', colors.green);
    log('📋 Next steps:', colors.cyan);
    log('1. Run: bun scripts/analyze-tables.ts', colors.cyan);
    log('2. Check: bun scripts/check-index-usage.ts', colors.cyan);
    log('3. Enable DB_COMPOSITE_INDEXES in .env.local', colors.cyan);

  } catch (error) {
    log('\n❌ Failed to create indexes!', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
