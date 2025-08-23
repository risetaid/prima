import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, type AdminUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin: AdminUser = await requireAdmin()

    const { userId } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isApproved: true, firstName: true, lastName: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete the user (reject means remove from system)
    await prisma.user.delete({
      where: { id: userId }
    })

    console.log(`❌ User rejected and deleted: ${user.email} by admin: ${admin.email}`)

    return NextResponse.json({
      success: true,
      message: 'User rejected and removed from system'
    })

  } catch (error) {
    console.error('Error rejecting user:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}