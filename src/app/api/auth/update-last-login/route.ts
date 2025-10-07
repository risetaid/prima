import { createApiHandler } from "@/lib/api-helpers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq, count } from "drizzle-orm";
import { logger } from '@/lib/logger';

// POST /api/auth/update-last-login - Update user login and sync with Clerk
export const POST = createApiHandler(
  { auth: "required" },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_req, { request: _ }) => {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error("Unauthorized");
    }

    // Try to find user by Clerk ID
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (existingUser.length === 0) {
      // Check if this is the first user (should be admin)
      const userCountResult = await db
        .select({ count: count(users.id) })
        .from(users);

      const userCount = userCountResult[0]?.count || 0;
      const isFirstUser = userCount === 0;

      // Create new user
      try {
        await db.insert(users).values({
          clerkId: userId,
          email: user.primaryEmailAddress?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: isFirstUser ? "ADMIN" : "RELAWAN",
          isApproved: isFirstUser, // First user auto-approved
          approvedAt: isFirstUser ? new Date() : null,
        });

        return {
          message: "User synced and login updated",
        };
      } catch (syncError: unknown) {
        logger.error("Auto-sync failed:", syncError instanceof Error ? syncError : new Error(String(syncError)));

        // Return success even if sync fails to prevent blocking user flow
        return {
          message: "Login successful, but user sync failed",
          warning: "User data may not be fully synchronized",
        };
      }
    }

    // User login tracking removed as lastLoginAt field not needed for this system

    return { success: true };
  }
);
