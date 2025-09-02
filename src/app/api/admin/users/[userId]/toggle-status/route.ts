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

    // Check if user exists
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        role: users.role,
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

    // Prevent admin from deactivating themselves or other admins
    if (user.role === 'ADMIN') {
      return NextResponse.json({ 
        error: 'Cannot modify admin user status' 
      }, { status: 400 })
    }

    // Toggle user status
    const updatedUserResult = await db
      .update(users)
      .set({
        isActive: !user.isActive
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive
      })

    const updatedUser = updatedUserResult[0]

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}