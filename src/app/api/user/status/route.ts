import { createApiHandler } from '@/lib/api-helpers'
import { auth } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// GET /api/user/status - Fast user status check without caching
export const GET = createApiHandler(
  { auth: "required" },
  async () => {
    // Get user directly from Clerk
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Fetch user directly from database (no cache for speed)
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const user = dbUsers[0];

    if (!user) {
      throw new Error('User not found in database');
    }

    // Compute derived properties
    const canAccessDashboard = user.isApproved && user.isActive;
    const needsApproval = !user.isApproved;

    logger.info('✅ User status computed', {
      userId,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive,
      canAccessDashboard,
      needsApproval
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive,
      canAccessDashboard,
      needsApproval,
      createdAt: user.createdAt
    };
  }
);

