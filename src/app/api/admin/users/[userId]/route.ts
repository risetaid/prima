import { createApiHandler } from '@/lib/api-helpers'
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
      throw new Error('User not found')
    }

    return {
      user: userResult[0]
    };
  }
);

// POST /api/admin/users/[userId] - Perform user management actions
export const POST = createApiHandler(
  {
    auth: "required",
    params: adminUserParamsSchema,
    query: userActionQuerySchema,
    body: toggleRoleBodySchema.optional()
  },
  async (body, { user, params, query }) => {
    // Only admins and developers can manage users
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { userId } = params!
    const { action } = query!

    logger.info(`User management action: ${action} for user ${userId} by ${user!.id}`);

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
      throw new Error('User not found')
    }

    const targetUser = userResult[0]

    switch (action) {
      case 'approve':
        return await handleApprove(userId, targetUser, user! as AdminUser)

      case 'reject':
        return await handleReject(userId)

      case 'toggle-role':
        if (!body) {
          throw new Error('Role is required for toggle-role action')
        }
        return await handleToggleRole(userId, targetUser, (body as { role: string }).role)

      case 'toggle-status':
        return await handleToggleStatus(userId, targetUser)

      default:
        throw new Error('Invalid action')
    }
  }
);

async function handleApprove(userId: string, user: { isApproved: boolean }, admin: AdminUser) {
  if (user.isApproved) {
    throw new Error('User is already approved')
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
  logger.info(`User ${userId} approved by admin ${admin.id}`)

  return {
    success: true,
    message: 'User approved successfully',
    user: updatedUser
  }
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

  logger.info(`User ${userId} rejected and removed from system`)

  return {
    success: true,
    message: 'User rejected and removed from system'
  }
}

async function handleToggleRole(userId: string, user: { id: string; email: string; role: string }, role: string) {
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
      throw new Error("Cannot demote the last admin/developer")
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

  logger.info(`User ${userId} role updated to ${role}`)

  return {
    success: true,
    message: `User role updated to ${role} successfully`,
    user: {
      id: user.id,
      email: user.email,
      newRole: role,
    },
  }
}

async function handleToggleStatus(userId: string, user: { id: string; email: string; role: string; isActive: boolean }) {
  // Prevent admin from deactivating themselves or other admins
  if (user.role === 'ADMIN') {
    throw new Error('Cannot modify admin user status')
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
  logger.info(`User ${userId} status ${updatedUser.isActive ? 'activated' : 'deactivated'}`)

  return {
    success: true,
    message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
    user: updatedUser
  }
}