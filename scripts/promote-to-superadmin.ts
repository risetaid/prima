#!/usr/bin/env bun

import { db, users } from '../src/db'
import { eq } from 'drizzle-orm'

async function promoteFirstUserToSuperadmin() {
  try {
    console.log('🔄 Promoting first user to SUPERADMIN...')

    // Get the first user (by creation date)
    const firstUserResult = await db
      .select()
      .from(users)
      .orderBy(users.createdAt)
      .limit(1)

    const firstUser = firstUserResult[0]

    if (!firstUser) {
      console.log('❌ No users found in database')
      return
    }

    console.log(`👤 First user found: ${firstUser.email} (current role: ${firstUser.role})`)

    // Update role to SUPERADMIN
    await db
      .update(users)
      .set({ 
        role: 'SUPERADMIN',
        updatedAt: new Date()
      })
      .where(eq(users.id, firstUser.id))

    console.log(`✅ Successfully promoted ${firstUser.email} to SUPERADMIN!`)
    console.log('🎉 You can now access the Superadmin Panel')
    
  } catch (error) {
    console.error('❌ Error promoting user to SUPERADMIN:', error)
    process.exit(1)
  }
}

// Run the promotion
promoteFirstUserToSuperadmin()
  .then(() => {
    console.log('\n🏁 User promotion completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })