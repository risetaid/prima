// src/app/api/health/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function hasValidApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("X-API-Key");
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!apiKey || !expectedKey) return false;
  
  // Simple comparison for now (will be upgraded in Phase 1)
  return apiKey === expectedKey;
}

export async function GET(req: NextRequest) {
  // Require API key for metrics endpoint
  if (!hasValidApiKey(req)) {
    logger.security("Unauthorized metrics access attempt", {
      operation: "health.metrics",
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = metrics.exportMetrics();

  return NextResponse.json({
    timestamp: snapshot.timestamp,
    metrics: snapshot,
  });
}
