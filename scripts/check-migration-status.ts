#!/usr/bin/env bun
/**
 * Check migration status and database schema state
 */

import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking migration status...')
    
    // Check if migrations table exists and get applied migrations
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      );
    `)
    
    console.log('Migration table exists:', result[0])
    
    if (result[0]?.exists) {
      const migrations = await db.execute(sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC;
      `)
      
      console.log('\nApplied migrations:')
      migrations.forEach((row: any) => {
        console.log(`  ✅ ${row.hash} - ${row.created_at}`)
      })
    }
    
    // Check if deleted_at columns exist
    console.log('\n🔍 Checking for deleted_at columns...')
    const columnsCheck = await db.execute(sql`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name = 'deleted_at'
      ORDER BY table_name;
    `)
    
    console.log('Tables with deleted_at column:')
    columnsCheck.forEach((row: any) => {
      console.log(`  📅 ${row.table_name}.${row.column_name}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

checkMigrationStatus()