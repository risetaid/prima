import { createApiHandler } from "@/lib/api-helpers";
import { auth } from "@clerk/nextjs/server";
import { del, CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/clear-cache - Emergency cache clear endpoint for developers
 * Clears user session cache to force refresh from database
 */
export const POST = createApiHandler(
  { auth: "required" },
  async (_, { request }) => {
    // Get userId directly from Clerk auth
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Clear session cache
    const sessionKey = CACHE_KEYS.userSession(userId);
    await del(sessionKey);

    // Also clear profile cache
    const profileKey = CACHE_KEYS.userProfile(userId);
    await del(profileKey);

    logger.info("User cache cleared successfully", {
      userId,
      sessionKey,
      profileKey,
    });

    return {
      message: "Cache cleared successfully. Please refresh the page.",
      clearedKeys: [sessionKey, profileKey],
    };
  }
);
