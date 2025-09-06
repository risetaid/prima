import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()

    const { userId } = await params

    // Check if user exists
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

    // User found, proceed with deletion

    // Delete the user (reject means remove from system)
    await db
      .delete(users)
      .where(eq(users.id, userId))

    return NextResponse.json({
      success: true,
      message: 'User rejected and removed from system'
    })

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}