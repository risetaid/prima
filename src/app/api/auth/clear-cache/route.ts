import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { del, CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";

/**
 * Emergency cache clear endpoint for developers
 * Clears user session cache to force refresh from database
 */
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
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

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully. Please refresh the page.",
      clearedKeys: [sessionKey, profileKey],
    });
  } catch (error) {
    logger.error(
      "Failed to clear cache",
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear cache",
      },
      { status: 500 }
    );
  }
}
