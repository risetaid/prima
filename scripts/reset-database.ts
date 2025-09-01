#!/usr/bin/env bun

import { db, users, patients, reminderSchedules, reminderLogs, manualConfirmations, patientVariables } from '../src/db'

async function resetDatabase() {
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!')
    console.log('🔄 Starting database reset...')

    // Delete all data in reverse dependency order
    console.log('🗑️  Deleting manual confirmations...')
    await db.delete(manualConfirmations)

    console.log('🗑️  Deleting reminder logs...')
    await db.delete(reminderLogs)

    console.log('🗑️  Deleting reminder schedules...')
    await db.delete(reminderSchedules)

    console.log('🗑️  Deleting patient variables...')
    await db.delete(patientVariables)

    console.log('🗑️  Deleting patients...')
    await db.delete(patients)

    // Note: messageTemplates table not created yet, will be added in Phase 11

    console.log('🗑️  Deleting users...')
    await db.delete(users)

    console.log('✅ Database reset completed successfully!')
    console.log('📝 Next steps:')
    console.log('   1. Login with your primary account')
    console.log('   2. First user will automatically get SUPERADMIN role')
    console.log('   3. Access /dashboard/admin (Superadmin Panel)')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('\n🏁 Database reset completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })