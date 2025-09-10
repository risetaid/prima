#!/usr/bin/env bun

/**
 * 🚨 DANGER ZONE 🚨
 *
 * COMPLETE DATABASE NUKE SCRIPT
 * This script will PERMANENTLY DELETE ALL DATA from your database
 *
 * Use with EXTREME caution - this action cannot be undone!
 *
 * Run with: bun run scripts/nuke-database.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/db/schema'

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
if (!connectionString) {
  console.error('❌ No DATABASE_URL or DIRECT_URL found in environment')
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema })

async function nukeDatabase() {
  console.log('🚨 STARTING COMPLETE DATABASE NUKE 🚨')
  console.log('⚠️  This will delete ALL data permanently!')
  console.log('⏳ Starting deletion process...\n')

  try {
    // Delete in order of dependencies (child tables first)

    console.log('🗑️  Deleting reminder content attachments...')
    await db.delete(schema.reminderContentAttachments)

    console.log('🗑️  Deleting reminder logs...')
    await db.delete(schema.reminderLogs)

    console.log('🗑️  Deleting manual confirmations...')
    await db.delete(schema.manualConfirmations)

    console.log('🗑️  Deleting reminder schedules...')
    await db.delete(schema.reminderSchedules)

    console.log('🗑️  Deleting patient medications...')
    await db.delete(schema.patientMedications)

    console.log('🗑️  Deleting medical records...')
    await db.delete(schema.medicalRecords)

    console.log('🗑️  Deleting health notes...')
    await db.delete(schema.healthNotes)

    console.log('🗑️  Deleting patient variables...')
    await db.delete(schema.patientVariables)

    console.log('🗑️  Deleting verification logs...')
    await db.delete(schema.verificationLogs)

    console.log('🗑️  Deleting patients...')
    await db.delete(schema.patients)

    console.log('🗑️  Deleting WhatsApp templates...')
    await db.delete(schema.whatsappTemplates)

    console.log('🗑️  Deleting medications...')
    await db.delete(schema.medications)

    console.log('🗑️  Deleting CMS articles...')
    await db.delete(schema.cmsArticles)

    console.log('🗑️  Deleting CMS videos...')
    await db.delete(schema.cmsVideos)

    console.log('🗑️  Deleting users...')
    await db.delete(schema.users)

    console.log('\n✅ DATABASE NUKE COMPLETE!')
    console.log('🧹 All data has been permanently deleted')
    console.log('💡 You can now run your seed scripts to populate fresh data')

  } catch (error) {
    console.error('❌ Error during database nuke:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Confirmation prompt
console.log('🚨 DANGER: This will DELETE ALL DATA from your database!')
console.log('💀 This action CANNOT be undone!')
console.log('')
console.log('Type "YES" to confirm deletion:')

process.stdin.once('data', async (data) => {
  const input = data.toString().trim()

  if (input === 'YES') {
    console.log('✅ Confirmation received. Proceeding with database nuke...\n')
    await nukeDatabase()
    process.exit(0)
  } else {
    console.log('❌ Operation cancelled. No data was deleted.')
    process.exit(0)
  }
})