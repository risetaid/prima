#!/usr/bin/env bun
/**
 * Apply Performance Indexes Migration
 * Runs the Phase 2 performance indexes on Railway Pro database
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

async function applyIndexes() {
  console.log('🔧 Applying Phase 2 Performance Indexes...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables')
    process.exit(1)
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
  })

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'drizzle/migrations/0009_performance_indexes.sql')
    console.log(`📄 Reading migration: ${migrationPath}`)
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Remove comments and split by semicolon
    // Note: CONCURRENTLY can't be used inside a transaction, so we'll apply indexes one by one
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))  // Remove comment lines
      .join('\n')
    
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && s !== 'BEGIN' && s !== 'COMMIT' && s.toUpperCase().includes('CREATE INDEX'))

    console.log(`📊 Found ${statements.length} index statements to execute\n`)

    let successCount = 0
    let skippedCount = 0

    for (const statement of statements) {
      if (!statement) continue

      try {
        // Extract index name for logging
        const indexMatch = statement.match(/idx_\w+/)
        const indexName = indexMatch ? indexMatch[0] : 'unknown'

        console.log(`⏳ Creating index: ${indexName}...`)
        await sql.unsafe(statement)
        successCount++
        console.log(`✅ Created: ${indexName}`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`⏭️  Skipped: Index already exists`)
          skippedCount++
        } else {
          console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Successfully created: ${successCount} indexes`)
    console.log(`⏭️  Skipped (already exist): ${skippedCount} indexes`)
    console.log('='.repeat(60))
    console.log('\n🎉 Phase 2 indexes applied successfully!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

applyIndexes().catch(error => {
  console.error('💥 Critical error:', error)
  process.exit(1)
})
