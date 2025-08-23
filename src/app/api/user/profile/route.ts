import { NextRequest, NextResponse } from 'next/server'
import { requireApprovedUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireApprovedUser()
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}