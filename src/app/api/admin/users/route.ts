import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users with approval info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        approvedAt: true,
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { isApproved: 'asc' }, // Pending approvals first
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
      pendingCount: users.filter(u => !u.isApproved).length
    })

  } catch (error) {
    console.error('Error fetching users for admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}