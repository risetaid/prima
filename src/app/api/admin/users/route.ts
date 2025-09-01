import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { db, users } from '@/db'
import { eq, desc, asc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Create alias for approver table to avoid naming conflicts
    const approver = alias(users, 'approver')
    
    // Get all users with approval info using Drizzle
    const allUsers = await db
      .select({
        // User fields
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
        createdAt: users.createdAt,
        approvedAt: users.approvedAt,
        approvedBy: users.approvedBy,
        // Approver fields
        approverFirstName: approver.firstName,
        approverLastName: approver.lastName,
        approverEmail: approver.email
      })
      .from(users)
      .leftJoin(approver, eq(users.approvedBy, approver.id)) // Self-join for approver info with alias
      .orderBy(
        asc(users.isApproved), // Pending approvals first
        desc(users.createdAt)
      )

    // Format response to match Prisma structure
    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      approvedAt: user.approvedAt,
      approver: user.approverFirstName ? {
        firstName: user.approverFirstName,
        lastName: user.approverLastName,
        email: user.approverEmail
      } : null
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length,
      pendingCount: formattedUsers.filter(u => !u.isApproved).length
    })

  } catch (error) {
    console.error('Error fetching users for admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}