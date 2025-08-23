import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await requireAdmin()
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = params

    // Check if user exists and is pending approval
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isApproved: true, firstName: true, lastName: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isApproved) {
      return NextResponse.json({ error: 'User is already approved' }, { status: 400 })
    }

    // Approve the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: admin.id
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isApproved: true,
        approvedAt: true
      }
    })

    console.log(`✅ User approved: ${user.email} by admin: ${admin.email}`)

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error approving user:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}