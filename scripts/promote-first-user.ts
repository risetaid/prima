#!/usr/bin/env bun

import { db, users } from '../src/db'
import { eq, asc } from 'drizzle-orm'
import { getWIBTime } from '../src/lib/timezone'

async function promoteFirstUserToSuperadmin() {
  try {
    console.log('🔍 Searching for first user in database...')
    
    // Get the first user by creation date
    const firstUser = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        clerkId: users.clerkId,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(asc(users.createdAt))
      .limit(1)

    if (firstUser.length === 0) {
      console.log('❌ No users found in database')
      return
    }

    const user = firstUser[0]
    
    console.log(`👤 First user found:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    console.log(`   Current Role: ${user.role}`)
    console.log(`   Created At: ${user.createdAt}`)
    
    if (user.role === 'SUPERADMIN') {
      console.log('✅ User is already a SUPERADMIN')
      return
    }

    console.log('🔄 Promoting user to SUPERADMIN...')
    
    // Update user role to SUPERADMIN
    await db
      .update(users)
      .set({
        role: 'SUPERADMIN',
        updatedAt: getWIBTime()
      })
      .where(eq(users.id, user.id))

    console.log('✅ Successfully promoted first user to SUPERADMIN!')
    console.log(`🎉 ${user.email} is now a SUPERADMIN with full system access`)
    
  } catch (error) {
    console.error('❌ Error promoting user to superadmin:', error)
    process.exit(1)
  }
}

// Run the promotion
promoteFirstUserToSuperadmin()
  .then(() => {
    console.log('🏁 Promotion completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })