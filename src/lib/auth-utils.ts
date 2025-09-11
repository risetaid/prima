import { db, users, patients } from "@/db";
import { redirect } from "next/navigation";
import { eq, and, isNull, desc, asc, count } from "drizzle-orm";
import type { User } from "@/db/schema";
import { logger } from "@/lib/logger";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

// Server-side only imports - conditionally imported to avoid client-side issues
let auth: (() => Promise<{ userId: string | null }>) | null = null;
let currentUser:
  | (() => Promise<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      primaryEmailAddress?: { emailAddress: string } | null;
    } | null>)
  | null = null;

// Request deduplication map to prevent concurrent getCurrentUser calls for the same user
const ongoingRequests = new Map<string, Promise<AuthUser | null>>();

// Only import server-side Clerk functions when not in browser
if (typeof window === "undefined") {
  const { auth: clerkAuth, currentUser: clerkCurrentUser } = await import(
    "@clerk/nextjs/server"
  );
  auth = clerkAuth;
  currentUser = clerkCurrentUser;
}

export interface AuthUser extends User {
  canAccessDashboard: boolean;
  needsApproval: boolean;
}

export interface AdminUser extends AuthUser {
  id: string;
  role: "ADMIN" | "SUPERADMIN";
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (!auth) {
      logger.error(
        "Clerk auth function not available",
        new Error("Auth function not initialized"),
        {
          auth: true,
          clerk: true,
        }
      );
      return null;
    }

    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    // Check if there's already an ongoing request for this user
    const ongoingRequest = ongoingRequests.get(userId);
    if (ongoingRequest) {
      logger.info("Reusing ongoing auth request for user", {
        auth: true,
        userId,
        deduplication: true,
      });
      return await ongoingRequest;
    }

    // Create a new request promise and store it
    const requestPromise = performGetCurrentUser(userId);
    ongoingRequests.set(userId, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the ongoing request
      ongoingRequests.delete(userId);
    }
  } catch (error) {
    logger.error(
      "Error getting current user",
      error instanceof Error ? error : new Error(String(error)),
      {
        auth: true,
        clerk: true,
      }
    );
    return null;
  }
}

// Internal function that performs the actual user lookup with caching and transaction safety
async function performGetCurrentUser(userId: string): Promise<AuthUser | null> {
  const cacheKey = CACHE_KEYS.userSession(userId);

  // Try to get from cache first
  const cachedUser = await getCachedData<AuthUser>(cacheKey);
  if (cachedUser) {
    logger.info("User data retrieved from cache", {
      auth: true,
      userId,
      cache: true,
    });
    return cachedUser;
  }

  if (!currentUser) {
    logger.error(
      "Clerk currentUser function not available",
      new Error("CurrentUser function not initialized"),
      {
        auth: true,
        clerk: true,
      }
    );
    return null;
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  // Get user from database using Clerk ID with enhanced retry logic and transaction safety
  let dbUserResult;
  let retries = 3;
  const baseDelay = 200;

  while (retries > 0) {
    try {
      // Use transaction for user lookup and sync operations
      dbUserResult = await db.transaction(async (tx) => {
        // First, try to find existing user
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1);

        if (existingUser[0]) {
          // Update last login timestamp atomically
          await tx
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.clerkId, userId));

          return existingUser[0];
        }

        // User doesn't exist, sync with Clerk data
        logger.info("No database user found for Clerk ID, attempting to sync", {
          auth: true,
          clerk: true,
          userId,
          sync: true,
        });

        // Check if this is the first user (should be superadmin) - use transaction-safe count
        const userCountResult = await tx
          .select({ count: count(users.id) })
          .from(users);

        const userCount = userCountResult[0]?.count || 0;
        const isFirstUser = userCount === 0;

        // Create user in database within transaction
        const newUserResult = await tx
          .insert(users)
          .values({
            clerkId: userId,
            email: user.primaryEmailAddress?.emailAddress || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            role: isFirstUser ? "SUPERADMIN" : "MEMBER",
            isApproved: isFirstUser, // First user auto-approved
            approvedAt: isFirstUser ? new Date() : null,
          })
          .returning();

        const newDbUser = newUserResult[0];

        if (!newDbUser) {
          throw new Error("Failed to create user record - no result returned");
        }

        logger.info("User synced successfully", {
          auth: true,
          clerk: true,
          userId,
          role: newDbUser.role,
          isApproved: newDbUser.isApproved,
          sync: true,
        });

        return newDbUser;
      });

      break;
    } catch (dbError: unknown) {
      retries--;
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown error";
      logger.warn("Database query failed during user authentication", {
        auth: true,
        database: true,
        userId,
        retriesLeft: retries,
        attempt: 4 - retries,
        error: errorMessage,
      });

      // Use exponential backoff for retries
      if (retries > 0) {
        const isRetriableError =
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("ECONNRESET") ||
          errorMessage.includes("ENOTFOUND") ||
          errorMessage.includes("pool");

        if (isRetriableError) {
          const delay = baseDelay * Math.pow(2, 3 - retries);
          logger.info(`Retrying database query in ${delay}ms`, {
            auth: true,
            database: true,
            userId,
            retryDelay: delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // For non-retriable errors, throw immediately
      throw dbError;
    }
  }

  const dbUser = dbUserResult;

  if (!dbUser) {
    // Return fallback user state for failed sync
    logger.info("Returning fallback auth state for failed sync", {
      auth: true,
      clerk: true,
      userId,
      fallback: true,
    });

    const fallbackUser: AuthUser = {
      id: "",
      clerkId: userId,
      email: user.primaryEmailAddress?.emailAddress || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      hospitalName: "",
      role: "MEMBER" as const,
      isApproved: false,
      isActive: true,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lastLoginAt: null,
      canAccessDashboard: false,
      needsApproval: true,
    };

    // Cache fallback user for short time to prevent repeated failures
    await setCachedData(cacheKey, fallbackUser, 60); // 1 minute
    return fallbackUser;
  }

  const authUser: AuthUser = {
    ...dbUser,
    canAccessDashboard: dbUser.isApproved && dbUser.isActive,
    needsApproval: !dbUser.isApproved,
  };

  // Cache the user data
  await setCachedData(cacheKey, authUser, CACHE_TTL.USER_SESSION);

  logger.info("User data cached successfully", {
    auth: true,
    userId,
    cache: true,
    ttl: CACHE_TTL.USER_SESSION,
  });

  return authUser;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

// Safe version for API routes that returns null instead of throwing redirect
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (error) {
    logger.warn("Failed to get authenticated user for API route", {
      auth: true,
      api: true,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function requireApprovedUser(): Promise<AuthUser> {
  const user = await requireAuth();

  if (!user.canAccessDashboard) {
    redirect("/pending-approval");
  }

  return user;
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireApprovedUser();

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    redirect("/unauthorized");
  }

  return user as AdminUser;
}

export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireApprovedUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/unauthorized");
  }

  return user;
}

export async function getUserPatients(userId: string) {
  try {
    // Only get patients assigned to this user - simplified version for now
    const patientsResult = await db
      .select()
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(
        and(
          eq(patients.assignedVolunteerId, userId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(patients.isActive), asc(patients.name));

    // For now, return simplified patient data (we can optimize this later with proper joins)
    return patientsResult.map((row) => ({
      id: row.patients.id,
      name: row.patients.name,
      phoneNumber: row.patients.phoneNumber,
      address: row.patients.address,
      birthDate: row.patients.birthDate,
      diagnosisDate: row.patients.diagnosisDate,
      cancerStage: row.patients.cancerStage,
      emergencyContactName: row.patients.emergencyContactName,
      emergencyContactPhone: row.patients.emergencyContactPhone,
      notes: row.patients.notes,
      isActive: row.patients.isActive,
      deletedAt: row.patients.deletedAt,
      complianceRate: 0, // TODO: Calculate properly with separate queries
      assignedVolunteer: row.users
        ? {
            id: row.users.id,
            firstName: row.users.firstName,
            lastName: row.users.lastName,
            email: row.users.email,
          }
        : null,
      createdAt: row.patients.createdAt,
      updatedAt: row.patients.updatedAt,
    }));
  } catch (error) {
    logger.error(
      "Error getting user patients",
      error instanceof Error ? error : new Error(String(error)),
      {
        auth: true,
        patients: true,
      }
    );
    return [];
  }
}
