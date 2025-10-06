import { createApiHandler, apiError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth-utils";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

// Custom error for unapproved users
class UnapprovedUserError extends Error {
  constructor() {
    super("Not approved");
    this.name = "UnapprovedUserError";
  }
}

// GET /api/user/profile - Get current user profile with auto-sync from Clerk
export const GET = createApiHandler(
  { auth: "optional" },
  async (_, { user, request }) => {
    logger.info("Profile API: Getting current user", { api: true });

    let authUser = user;

    // If user not found in database, try to sync from Clerk
    if (!authUser) {
      logger.info("Profile API: User not found in DB, trying to sync from Clerk", { api: true });

      const { userId } = await auth();
      const clerkUser = await currentUser();

      if (!userId || !clerkUser) {
        logger.warn("Profile API: No Clerk authentication found", { api: true });
        throw new Error("Not authenticated");
      }

      logger.info("Profile API: Creating new user", { api: true, userId });

      try {
        // Check if this is the first user (should be superadmin)
        const userCountResult = await db
          .select({ count: count(users.id) })
          .from(users);

        const userCount = userCountResult[0]?.count || 0;
        const isFirstUser = userCount === 0;

        logger.info("Profile API: User count check", { api: true, userCount, isFirstUser });

        // Create user in database
        await db.insert(users).values({
          clerkId: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          role: isFirstUser ? "ADMIN" : "RELAWAN",
          isApproved: isFirstUser,
          approvedAt: isFirstUser ? new Date() : null,
        });

        logger.info("Profile API: User created successfully", { api: true, userId });

        // Give a small delay to ensure the user is properly created
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get user again after creation with retry logic
        let retries = 3;
        while (retries > 0 && !authUser) {
          authUser = await getCurrentUser();
          if (!authUser && retries > 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          retries--;
        }

        if (!authUser) {
          logger.error("Profile API: Failed to retrieve user after creation", new Error("User retrieval failed"), { api: true, userId });
          throw new Error("Failed to create user profile");
        }
      } catch (dbError: unknown) {
        // If user already exists (race condition), try to get them again
        const error = dbError as { code?: string; message?: string };
        if (
          error.code === "23505" ||
          error.message?.includes("unique constraint")
        ) {
          logger.info("Profile API: User already exists, fetching", { api: true, userId });
          authUser = await getCurrentUser();
        } else {
          throw dbError;
        }
      }
    }

    // Handle unauthenticated users properly
    if (!authUser) {
      logger.warn("Profile API: User still not found after all attempts", { api: true });
      throw new Error("Not authenticated");
    }

    logger.info("Profile API: User found", { api: true, role: authUser.role, isApproved: authUser.isApproved });

    // Handle unapproved users - return custom response
    if (!authUser.canAccessDashboard) {
      logger.warn("Profile API: User not approved for dashboard access", { api: true, userId: authUser.id });
      // Return custom response for unapproved users
      return NextResponse.json(
        { error: "Not approved", needsApproval: true },
        { status: 403 }
      );
    }

    return authUser;
  }
);
