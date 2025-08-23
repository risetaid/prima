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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true, role: true, firstName: true, lastName: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from deactivating themselves or other admins
    if (user.role === 'ADMIN') {
      return NextResponse.json({ 
        error: 'Cannot modify admin user status' 
      }, { status: 400 })
    }

    // Toggle user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    console.log(`🔄 User status toggled: ${user.email} -> ${updatedUser.isActive ? 'active' : 'inactive'} by admin: ${admin.email}`)

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    })

  } catch (error) {
    console.error('Error toggling user status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}