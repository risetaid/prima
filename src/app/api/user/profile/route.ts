import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    // Handle unauthenticated users properly
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Handle unapproved users
    if (!user.canAccessDashboard) {
      return NextResponse.json(
        { error: 'Not approved', needsApproval: true },
        { status: 403 }
      )
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}