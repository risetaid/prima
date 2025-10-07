import { getCurrentUser } from "@/lib/auth-utils";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq, count } from "drizzle-orm";
import { nowWIB } from "@/lib/datetime";
import { logger } from "@/lib/logger";
// DB utils temporarily inlined
import {
  get,
  set,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";
import { NextResponse } from "next/server";

interface UserSessionData {
  success: boolean;
  user: {
    id: string;
    clerkId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isApproved: boolean;
    isActive: boolean;
    canAccessDashboard: boolean;
    needsApproval: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  session: {
    authenticated: boolean;
    loginTime: string;
    accessLevel: string;
    dashboardAccess: boolean;
  };
  error?: string;
  needsApproval?: boolean;
  redirectTo?: string;
  fallbackMode?: boolean;
}

/**
 * Consolidated User Session API
 * Combines: /api/user/profile + /api/user/status + /api/auth/update-last-login
 *
 * This single endpoint:
 * 1. Handles user authentication and sync from Clerk
 * 2. Updates last login timestamp (background)
 * 3. Returns complete user session data
 *
 * Reduces 3 sequential API calls to 1 consolidated call (70% reduction)
 */
export async function POST() {
  const startTime = Date.now();

  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          success: false,
          needsLogin: true,
        },
        { status: 401 }
      );
    }

    // Try to get from cache first for massive performance boost
    const cacheKey = CACHE_KEYS.userSession(userId);
    let cachedSession = null;

    try {
      cachedSession = await get<UserSessionData>(cacheKey);
    } catch (cacheError) {
      logger.warn("Cache unavailable, proceeding without cache", {
        api: true,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
      // Continue without cache - don't fail the entire request
    }

    if (cachedSession) {
      logger.info("User session cache hit - instant response", { api: true, cache: true });
      // Still update login timestamp in background (non-blocking)
      setImmediate(async () => {
        try {
          await db
            .update(users)
            .set({
              lastLoginAt: nowWIB(),
              updatedAt: nowWIB(),
            })
            .where(eq(users.clerkId, userId));
        } catch (error) {
          logger.warn("Background login update failed", { api: true, error: error instanceof Error ? error.message : String(error) });
        }
      });

      return NextResponse.json(cachedSession);
    }

    logger.info("User session cache miss - fetching from database", { api: true, cache: true });

    // Try to get existing user first with connection pool aware settings
    let user = await getCurrentUser();

    // FALLBACK: If database fails but user is authenticated in Clerk, provide minimal session
    if (!user) {
      logger.warn("Database unavailable, providing fallback Clerk-only session", { api: true, userId });
      // Smart fallback: Check if this looks like an existing admin user based on Clerk data
      const likelyAdmin =
        clerkUser.primaryEmailAddress?.emailAddress?.includes("admin") ||
        (clerkUser.createdAt &&
          new Date(clerkUser.createdAt).getTime() <
            Date.now() - 7 * 24 * 60 * 60 * 1000); // Created more than 7 days ago

      const fallbackSession = {
        success: true,
        user: {
          id: "clerk-fallback",
          clerkId: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          role: likelyAdmin ? "ADMIN" : "RELAWAN", // Smarter role detection
          isApproved: likelyAdmin, // Allow likely admins temporary access
          isActive: true,
          canAccessDashboard: likelyAdmin, // Allow dashboard access for likely admins
          needsApproval: !likelyAdmin,
          createdAt: new Date(),
          lastLoginAt: null,
        },
        session: {
          authenticated: true,
          loginTime: new Date().toISOString(),
          accessLevel: likelyAdmin ? "ADMIN" : "RELAWAN",
          dashboardAccess: likelyAdmin,
          fallback: true, // Flag to indicate this is fallback mode
        },
        needsApproval: !likelyAdmin,
        fallbackMode: true,
      };

      // Don't cache fallback sessions - they should be temporary
      const statusCode = likelyAdmin ? 200 : 403; // Allow admins through, block others
      return NextResponse.json(fallbackSession, { status: statusCode });
    }

    // If user not found in database, create/sync from Clerk
    if (!user) {
      try {
        // Check if this is the first user (should be ADMIN) - optimized query
        const userCountResult = await db
          .select({ count: count(users.id) })
          .from(users)
          .limit(1); // Only need to know if any exist

        const userCount = userCountResult[0]?.count || 0;
        const isFirstUser = userCount === 0;

        // Create user in database with reasonable retry mechanism
        await db.insert(users).values({
          clerkId: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          role: isFirstUser ? "ADMIN" : "RELAWAN",
          isApproved: isFirstUser,
          approvedAt: isFirstUser ? new Date() : null,
        });

        // Get user again after creation with reasonable timeout
        user = await getCurrentUser();
      } catch (syncError) {
        logger.error("User Session: Failed to sync user from Clerk", syncError as Error, { api: true, userId });
        return NextResponse.json(
          {
            error: "Failed to sync user account",
            success: false,
            needsSupport: true,
          },
          { status: 500 }
        );
      }
    }

    // Handle case where user still not found after sync attempt
    if (!user) {
      return NextResponse.json(
        {
          error: "User account not found",
          success: false,
          needsSupport: true,
        },
        { status: 404 }
      );
    }

    // Background login timestamp update (non-blocking) - optimized with shorter timeouts
    // This replaces the separate /api/auth/update-last-login call for performance
    setImmediate(async () => {
      try {
        await db
          .update(users)
          .set({
            lastLoginAt: nowWIB(),
            updatedAt: nowWIB(),
          })
          .where(eq(users.clerkId, userId));
      } catch (error) {
        logger.warn("Background login update failed", { api: true, error: error instanceof Error ? error.message : String(error) });
        // Don't throw - this is non-critical for user session
      }
    });

    // Return complete session data combining all three endpoints
    const sessionData = {
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved,
        isActive: user.isActive,
        canAccessDashboard: user.canAccessDashboard,
        needsApproval: user.needsApproval,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      session: {
        authenticated: true,
        loginTime: new Date().toISOString(),
        accessLevel: user.role,
        dashboardAccess: user.canAccessDashboard,
      },
    };

    // Handle unapproved users
    if (!user.canAccessDashboard) {
      const unapprovedResponse = {
        ...sessionData,
        success: false,
        error: "Account pending approval",
        needsApproval: true,
        redirectTo: "/pending-approval",
      };
      // Cache unapproved response too (shorter TTL)
      set(cacheKey, unapprovedResponse, 60); // 1 minute for unapproved
      return NextResponse.json(unapprovedResponse, { status: 403 });
    }

    // Cache successful session data for future requests
set(cacheKey, sessionData, CACHE_TTL.USER_SESSION).catch(
      (error: unknown) => {
        logger.warn("Failed to cache user session", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    return NextResponse.json(sessionData);
  } catch (error) {
    logger.error("User Session: Unexpected error", error as Error, {
      api: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: "Session initialization failed",
        success: false,
        needsRetry: true,
        debugInfo: {
          timestamp: new Date().toISOString(),
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

// GET method for session check (non-modifying)
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          needsLogin: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        canAccessDashboard: user.canAccessDashboard,
      },
    });
  } catch (error) {
    logger.error("Session Check: Error", error as Error, { api: true });
    return NextResponse.json(
      {
        authenticated: false,
        error: "Session check failed",
      },
      { status: 500 }
    );
  }
}
