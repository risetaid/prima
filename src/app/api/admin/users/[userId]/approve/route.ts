import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, type AdminUser } from '@/lib/auth-utils'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin: AdminUser = await requireAdmin()

    const { userId } = await params

    // Check if user exists and is pending approval
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        isApproved: users.isApproved,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    if (user.isApproved) {
      return NextResponse.json({ error: 'User is already approved' }, { status: 400 })
    }

    // Approve the user
    const updatedUserResult = await db
      .update(users)
      .set({
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: admin.id
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isApproved: users.isApproved,
        approvedAt: users.approvedAt
      })

    const updatedUser = updatedUserResult[0]

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
      user: updatedUser
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}