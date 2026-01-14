/**
 * API v1 Health Check Endpoint
 *
 * Versioned API route for health checks.
 * All v1 routes return consistent version headers.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { API_VERSION, VERSION_HEADER } from "@/lib/api-versioning";

export async function GET() {
  // Check database
  let dbHealthy = false;
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbHealthy = true;
    dbLatency = Date.now() - dbStart;
  } catch {
    // Ignore
  }

  // Check Redis
  let redisHealthy = false;
  let redisLatency = 0;
  try {
    const redisStart = Date.now();
    await redis.ping();
    redisHealthy = true;
    redisLatency = Date.now() - redisStart;
  } catch {
    // Ignore
  }

  const allHealthy = dbHealthy && redisHealthy;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      version: API_VERSION,
      checks: {
        database: { healthy: dbHealthy, latency_ms: dbLatency },
        redis: { healthy: redisHealthy, latency_ms: redisLatency },
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        [VERSION_HEADER]: API_VERSION,
      },
    }
  );
}
