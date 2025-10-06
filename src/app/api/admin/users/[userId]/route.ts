import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { type AdminUser } from '@/lib/auth-utils'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { getWIBTime } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const adminUserParamsSchema = z.object({
  userId: z.string().uuid(),
});

const userActionQuerySchema = z.object({
  action: z.enum(['approve', 'reject', 'toggle-role', 'toggle-status']),
});

const toggleRoleBodySchema = z.object({
  role: z.enum(["ADMIN", "RELAWAN", "DEVELOPER"]),
});

// GET /api/admin/users/[userId] - Get user details for admin
export const GET = createApiHandler(
  { auth: "required", params: adminUserParamsSchema },
  async (_, { user, params }) => {
    // Only admins and developers can access user management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { userId } = params!

    // Get user details
    const userResult = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
        createdAt: users.createdAt,
        approvedAt: users.approvedAt,
        approvedBy: users.approvedBy,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return {
      user: userResult[0]
    };
  }
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and developers can manage users
    if (currentUser.role !== "ADMIN" && currentUser.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!action || !['approve', 'reject', 'toggle-role', 'toggle-status'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid or missing action. Use: approve, reject, toggle-role, toggle-status' 
      }, { status: 400 })
    }

    // Check if user exists
    const userResult = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    switch (action) {
      case 'approve':
        return await handleApprove(userId, user, currentUser as AdminUser)
      
      case 'reject':
        return await handleReject(userId)
      
      case 'toggle-role':
        return await handleToggleRole(userId, user, request)
      
      case 'toggle-status':
        return await handleToggleStatus(userId, user)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: unknown) {
    logger.error("Error in user management action:", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function handleApprove(userId: string, user: { isApproved: boolean }, admin: AdminUser) {
  if (user.isApproved) {
    return NextResponse.json({ error: 'User is already approved' }, { status: 400 })
  }

  // Approve the user
  const updatedUserResult = await db
    .update(users)
    .set({
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: admin.id,
      updatedAt: getWIBTime(),
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
}

async function handleReject(userId: string) {
  // Soft delete the user (reject means remove from system but keep audit trail)
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      updatedAt: getWIBTime(),
      isActive: false,
      isApproved: false
    })
    .where(eq(users.id, userId))

  return NextResponse.json({
    success: true,
    message: 'User rejected and removed from system'
  })
}

async function handleToggleRole(userId: string, user: { id: string; email: string; role: string }, request: NextRequest) {
  const { role } = await request.json()

  if (!role || !["ADMIN", "RELAWAN", "DEVELOPER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // Prevent demoting the last admin/developer
  if ((user.role === "ADMIN" || user.role === "DEVELOPER") && 
      role !== "ADMIN" && role !== "DEVELOPER") {
    const adminCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.role, "ADMIN"))

    const developerCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.role, "DEVELOPER"))

    if (adminCount.length + developerCount.length <= 1) {
      return NextResponse.json(
        {
          error: "Cannot demote the last admin/developer",
        },
        { status: 400 }
      )
    }
  }

  // Update user role in database
  await db
    .update(users)
    .set({
      role: role as "ADMIN" | "RELAWAN" | "DEVELOPER",
      updatedAt: getWIBTime(),
    })
    .where(eq(users.id, userId))

  return NextResponse.json({
    success: true,
    message: `User role updated to ${role} successfully`,
    user: {
      id: user.id,
      email: user.email,
      newRole: role,
    },
  })
}

async function handleToggleStatus(userId: string, user: { id: string; email: string; role: string; isActive: boolean }) {
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
      isActive: !user.isActive,
      updatedAt: getWIBTime(),
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
}