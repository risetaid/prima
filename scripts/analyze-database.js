#!/usr/bin/env node

/**
 * Script to analyze Supabase database tables and identify unnecessary ones
 * Usage: bun scripts/analyze-database.js
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

async function analyzeDatabase() {
  console.log('🔍 Analyzing Supabase database tables...\n')
  
  try {
    // Get all tables in public schema
    const tablesResult = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log(`📊 Found ${tablesResult.length} tables in public schema:\n`)
    
    // Analyze each table
    for (const table of tablesResult) {
      const tableName = table.table_name
      const tableType = table.table_type
      
      console.log(`\n📋 Table: ${tableName} (${tableType})`)
      console.log('─'.repeat(50))
      
      try {
        // Get table structure
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `)
        
        console.log('Columns:')
        columnsResult.forEach(col => {
          console.log(`  • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
        })
        
        // Get row count
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`)
        const rowCount = countResult[0]?.count || 0
        console.log(`\nRow count: ${rowCount}`)
        
        // Sample data (first 3 rows)
        if (rowCount > 0) {
          const sampleResult = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)} LIMIT 3`)
          if (sampleResult.length > 0) {
            console.log('\nSample data:')
            sampleResult.forEach((row, index) => {
              console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2))
            })
          }
        }
        
      } catch (error) {
        console.log(`❌ Error analyzing table ${tableName}:`, error.message)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('📝 ANALYSIS SUMMARY')
    console.log('='.repeat(70))
    
    // Expected tables from schema
    const expectedTables = [
      'users', 'patients', 'medical_records', 'medications', 'patient_medications',
      'reminder_schedules', 'reminder_logs', 'manual_confirmations', 'whatsapp_templates',
      'health_notes', 'patient_variables', 'verification_logs', 'cms_articles', 'cms_videos',
      'reminder_content_attachments'
    ]
    
    const actualTables = tablesResult.map(t => t.table_name)
    const unexpectedTables = actualTables.filter(t => !expectedTables.includes(t))
    const missingTables = expectedTables.filter(t => !actualTables.includes(t))
    
    if (unexpectedTables.length > 0) {
      console.log('\n⚠️  UNEXPECTED TABLES (potentially unnecessary):')
      unexpectedTables.forEach(table => {
        console.log(`  • ${table}`)
      })
    }
    
    if (missingTables.length > 0) {
      console.log('\n❌ MISSING EXPECTED TABLES:')
      missingTables.forEach(table => {
        console.log(`  • ${table}`)
      })
    }
    
    console.log('\n✅ EXPECTED TABLES FOUND:')
    const foundExpected = expectedTables.filter(t => actualTables.includes(t))
    foundExpected.forEach(table => {
      console.log(`  • ${table}`)
    })
    
    console.log('\n📋 DRIZZLE MIGRATION TABLES:')
    const migrationTables = actualTables.filter(t => t.includes('drizzle') || t.includes('migration'))
    migrationTables.forEach(table => {
      console.log(`  • ${table} (keep - needed for migrations)`)
    })
    
  } catch (error) {
    console.error('❌ Database analysis failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run analysis
analyzeDatabase().catch(console.error)