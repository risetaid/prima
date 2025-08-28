import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { prisma } from '@/lib/prisma'
import { nowWIB } from '@/lib/datetime'

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find user by Stack ID, if not found create user
    const existingUser = await prisma.user.findUnique({
      where: { stackId: user.id }
    })

    if (!existingUser) {
      console.log(`User with Stack ID ${user.id} not found in database. Auto-syncing user...`)
      
      // Check if this is the first user (should be admin)
      const userCount = await prisma.user.count()
      const isFirstUser = userCount === 0

      // Create new user for Stack Auth
      try {        
        await prisma.user.create({
          data: {
            stackId: user.id,
            email: user.primaryEmail || '',
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            role: isFirstUser ? 'ADMIN' : 'MEMBER',
            isApproved: isFirstUser, // First user auto-approved
            approvedAt: isFirstUser ? new Date() : null
          }
        })
        
        console.log(`✅ User auto-synced: ${user.primaryEmail}`)
        return NextResponse.json({ success: true, message: 'User synced and login updated' })
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError)
        return NextResponse.json({ 
          success: false, 
          message: 'User not synced and auto-sync failed',
          error: syncError instanceof Error ? syncError.message : 'Unknown error'
        }, { status: 404 })
      }
    }

    // User login tracking removed as lastLoginAt field not needed for this system
    console.log(`✅ User logged in: ${existingUser.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating last login:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}