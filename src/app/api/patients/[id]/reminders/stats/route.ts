import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { CompletionCalculationService } from "@/services/reminder/completion-calculation.service";

import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for cache invalidation request
    const { searchParams } = new URL(request.url);
    const invalidate = searchParams.get("invalidate") === "true";

    // Try to get from cache first (unless invalidating)
    const cacheKey = CACHE_KEYS.reminderStats(id);
    if (!invalidate) {
      const cachedStats = await getCachedData(cacheKey);
      if (cachedStats) {
        return NextResponse.json(cachedStats);
      }
    } else {
      // Invalidate cache when requested
      await invalidateCache(cacheKey);
    }



    // Get reminder status counts using standardized completion logic
    const statusCounts = await CompletionCalculationService.getReminderStatusCounts(id);

    const stats = {
      terjadwal: statusCounts.terjadwal,
      perluDiperbarui: statusCounts.perluDiperbarui,
      selesai: statusCounts.selesai,
      semua: statusCounts.terjadwal + statusCounts.perluDiperbarui + statusCounts.selesai,
    };

    // Cache the stats with shorter TTL since they change more frequently
    await setCachedData(cacheKey, stats, CACHE_TTL.REMINDER_STATS);

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
