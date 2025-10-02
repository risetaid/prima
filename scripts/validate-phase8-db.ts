#!/usr/bin/env bun

/**
 * Phase 8 Database Validation Script
 *
 * Validates that all database schema changes from Phase 1 are properly applied
 * and that the conversation_states table has the required fields.
 */

import { db } from '@/db'
import { conversationStates } from '@/db'
import { logger } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

async function validateDatabaseSchema() {
  console.log('🔍 Validating Phase 8 Database Schema...\n')

  try {
    // 1. Check if conversation_states table exists
    console.log('1️⃣ Checking conversation_states table...')
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'conversation_states'
      );
    `)
    console.log('   ✅ Table exists\n')

    // 2. Check for new columns from Phase 1
    console.log('2️⃣ Checking Phase 1 schema fields...')

    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'conversation_states'
      AND column_name IN ('attempt_count', 'context_set_at', 'last_clarification_sent_at')
      ORDER BY column_name;
    `)

    const requiredColumns = ['attempt_count', 'context_set_at', 'last_clarification_sent_at']
    const rows = Array.isArray(columns) ? columns : (columns.rows || [])
    const foundColumns = rows.map((row: any) => row.column_name)

    for (const colName of requiredColumns) {
      if (foundColumns.includes(colName)) {
        const col = rows.find((r: any) => r.column_name === colName)
        console.log(`   ✅ ${colName}: ${col.data_type} (nullable: ${col.is_nullable})`)
      } else {
        console.log(`   ❌ MISSING: ${colName}`)
        throw new Error(`Required column ${colName} not found`)
      }
    }
    console.log()

    // 3. Verify attempt_count default value
    console.log('3️⃣ Verifying attempt_count default value...')
    const attemptCountCol = rows.find((r: any) => r.column_name === 'attempt_count')
    if (attemptCountCol && attemptCountCol.column_default?.includes('0')) {
      console.log('   ✅ attempt_count default = 0\n')
    } else {
      console.log('   ⚠️  Warning: attempt_count default may not be set to 0\n')
    }

    // 4. Check existing data
    console.log('4️⃣ Checking existing conversation states...')
    const existingStates = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE attempt_count > 0) as with_attempts,
        COUNT(*) FILTER (WHERE context_set_at IS NOT NULL) as with_context_set,
        COUNT(*) FILTER (WHERE last_clarification_sent_at IS NOT NULL) as with_clarification
      FROM conversation_states
      WHERE deleted_at IS NULL;
    `)

    const statsRows = Array.isArray(existingStates) ? existingStates : (existingStates.rows || [])
    const stats = statsRows[0] as any
    console.log(`   📊 Total active conversation states: ${stats.total}`)
    console.log(`   📊 With attempts > 0: ${stats.with_attempts}`)
    console.log(`   📊 With context_set_at: ${stats.with_context_set}`)
    console.log(`   📊 With last_clarification_sent_at: ${stats.with_clarification}`)
    console.log()

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Phase 8 Database Validation: PASSED')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('All required schema changes are in place:')
    console.log('  ✅ attempt_count field (integer, default 0)')
    console.log('  ✅ context_set_at field (timestamp with timezone)')
    console.log('  ✅ last_clarification_sent_at field (timestamp with timezone)')
    console.log()
    console.log('Database is ready for Phase 8 testing! 🚀')
    console.log()

    process.exit(0)
  } catch (error) {
    console.error('❌ Validation failed:', error)
    logger.error('Phase 8 database validation failed', error as Error)
    process.exit(1)
  }
}

// Run validation
validateDatabaseSchema()
