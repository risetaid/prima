#!/usr/bin/env node

/**
 * Script to clean up unnecessary tables from Supabase database
 * Based on database analysis - removes Payload CMS and old Articles/Videos tables
 * Usage: bun scripts/cleanup-database.js
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

// Load environment variables manually
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  lines.forEach(line => {
    const [key, ...valueParts] = line.trim().split('=')
    if (key && valueParts.length) {
      process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
    }
  })
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_URL not found in environment variables')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...\n')
  
  try {
    // Tables to remove (identified as unnecessary from analysis)
    const tablesToDrop = [
      // Old Payload CMS tables (not used in current system)
      'payload_locked_documents',
      'payload_locked_documents_rels', 
      'payload_migrations',
      'payload_preferences',
      'payload_preferences_rels',
      // Old articles/videos tables (replaced by cms_articles/cms_videos)
      'articles',
      'videos',
      'users_old' // if exists
    ]
    
    // Check which tables actually exist before dropping
    const existingTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const existingTables = existingTablesResult.map(t => t.table_name)
    const tablesToActuallyDrop = tablesToDrop.filter(table => existingTables.includes(table))
    
    if (tablesToActuallyDrop.length === 0) {
      console.log('✅ No unnecessary tables found to clean up!')
      return
    }
    
    console.log(`📋 Found ${tablesToActuallyDrop.length} tables to remove:`)
    tablesToActuallyDrop.forEach(table => {
      console.log(`  • ${table}`)
    })
    
    console.log('\n⚠️  WARNING: This will permanently delete the tables and all their data!')
    console.log('Make sure you have a backup if needed.\n')
    
    // Check if any of these tables have data
    console.log('📊 Checking table contents before deletion:\n')
    
    for (const tableName of tablesToActuallyDrop) {
      try {
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`)
        const rowCount = countResult[0]?.count || 0
        console.log(`  ${tableName}: ${rowCount} rows`)
        
        // Show sample data if exists
        if (rowCount > 0) {
          const sampleResult = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)} LIMIT 2`)
          console.log(`    Sample:`, JSON.stringify(sampleResult[0], null, 2))
        }
      } catch (error) {
        console.log(`  ${tableName}: Error reading table - ${error.message}`)
      }
    }
    
    // Ask for confirmation (in a real scenario - for now we'll simulate)
    console.log('\n🔄 Proceeding with cleanup...\n')
    
    // Drop tables in correct order (handle dependencies)
    for (const tableName of tablesToActuallyDrop) {
      try {
        console.log(`🗑️  Dropping table: ${tableName}`)
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)} CASCADE`)
        console.log(`✅ Successfully dropped: ${tableName}`)
      } catch (error) {
        console.error(`❌ Failed to drop ${tableName}:`, error.message)
      }
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...')
    const remainingTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const remainingTables = remainingTablesResult.map(t => t.table_name)
    const stillExisting = tablesToActuallyDrop.filter(table => remainingTables.includes(table))
    
    if (stillExisting.length > 0) {
      console.log('⚠️  Some tables were not deleted:')
      stillExisting.forEach(table => console.log(`  • ${table}`))
    } else {
      console.log('✅ All unnecessary tables successfully removed!')
    }
    
    console.log('\n📋 Remaining tables:')
    remainingTables.forEach(table => {
      console.log(`  • ${table}`)
    })
    
    console.log(`\n🎉 Database cleanup completed! ${tablesToActuallyDrop.length} unnecessary tables removed.`)
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run cleanup
cleanupDatabase().catch(console.error)