import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { nowWIB } from '@/lib/datetime'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to update user, if not found then user hasn't been synced from webhook yet
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    })

    if (!existingUser) {
      console.log(`User with Clerk ID ${user.id} not found in database. Auto-syncing user...`)
      
      // Use upsert to handle potential email conflicts
      try {        
        await prisma.user.upsert({
          where: { clerkId: user.id },
          create: {
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phoneNumber: user.phoneNumbers[0]?.phoneNumber || null,
            role: 'VOLUNTEER',
            lastLoginAt: nowWIB()
          },
          update: {
            lastLoginAt: nowWIB()
          }
        })
        
        console.log(`✅ User auto-synced: ${user.emailAddresses[0]?.emailAddress}`)
        return NextResponse.json({ success: true, message: 'User synced and login updated' })
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError)
        
        // If still failing, might be email constraint issue
        // Try to find user by email and update clerkId
        const emailUser = await prisma.user.findUnique({
          where: { email: user.emailAddresses[0]?.emailAddress || '' }
        })
        
        if (emailUser && (emailUser.clerkId !== user.id || !emailUser.isActive)) {
          console.log('Found existing user by email, updating with new clerkId and reactivating...')
          await prisma.user.update({
            where: { email: user.emailAddresses[0]?.emailAddress || '' },
            data: {
              clerkId: user.id,
              firstName: user.firstName || emailUser.firstName,
              lastName: user.lastName || emailUser.lastName,
              isActive: true,
              lastLoginAt: nowWIB()
            }
          })
          return NextResponse.json({ success: true, message: 'Existing user updated with new clerkId and reactivated' })
        }
        
        return NextResponse.json({ 
          success: false, 
          message: 'User not synced and auto-sync failed',
          error: syncError instanceof Error ? syncError.message : 'Unknown error'
        }, { status: 404 })
      }
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        lastLoginAt: nowWIB()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating last login:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}