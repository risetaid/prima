#!/usr/bin/env bun

import { db, users } from '../src/db'
import { asc } from 'drizzle-orm'

async function debugUsers() {
  try {
    console.log('🔍 Fetching all users from database...')
    
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
        clerkId: users.clerkId,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(asc(users.createdAt))

    if (allUsers.length === 0) {
      console.log('❌ No users found in database')
      return
    }

    console.log(`\n📊 Found ${allUsers.length} users in database:\n`)
    
    allUsers.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.firstName} ${user.lastName}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Approved: ${user.isApproved}`)
      console.log(`   Clerk ID: ${user.clerkId}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   ---`)
    })

    // Check for SUPERADMIN users
    const superAdmins = allUsers.filter(u => u.role === 'SUPERADMIN')
    console.log(`\n⭐ SUPERADMIN users: ${superAdmins.length}`)
    
    if (superAdmins.length === 0) {
      console.log('⚠️  No SUPERADMIN found! First user should be promoted.')
      
      const firstUser = allUsers[0]
      if (firstUser) {
        console.log(`\n🎯 First user (${firstUser.email}) should be promoted to SUPERADMIN`)
        console.log(`   Current role: ${firstUser.role}`)
        console.log(`   Should promote? ${firstUser.role !== 'SUPERADMIN' ? 'YES' : 'NO'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging users:', error)
    process.exit(1)
  }
}

// Run the debug
debugUsers()
  .then(() => {
    console.log('\n🏁 Debug completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })