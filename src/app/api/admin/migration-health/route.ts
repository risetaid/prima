// src/app/api/admin/migration-health/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { metrics } from "@/lib/metrics";
import { featureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

async function getConnectionPoolStats() {
  // Note: postgres.js doesn't expose pool stats directly
  // We'll track these via metrics in Phase 2
  return {
    active: metrics.getGauge('db.pool.active') || 0,
    idle: metrics.getGauge('db.pool.idle') || 0,
    waiting: metrics.getGauge('db.pool.waiting') || 0,
    max: 20, // Current setting (will be 15 in Phase 2)
  };
}

async function getIndexUsageStats() {
  try {
    // Query PostgreSQL statistics for our indexes
    const result = await db.execute(sql`
      SELECT 
        indexrelname as index_name,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      AND indexrelname LIKE '%conversation%'
      ORDER BY idx_scan DESC
    `);
    
    return result;
  } catch {
    return [];
  }
}

export async function GET() {
  // Require admin authentication
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin or developer
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "DEVELOPER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Gather all migration health data
  const snapshot = metrics.exportMetrics();
  const flagMetadata = featureFlags.getAllMetadata();
  const connectionPool = await getConnectionPoolStats();
  const indexUsage = await getIndexUsageStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    feature_flags: flagMetadata,
    metrics: {
      counters: snapshot.counters,
      histograms: snapshot.histograms,
      gauges: snapshot.gauges,
    },
    database: {
      connection_pool: connectionPool,
      index_usage: indexUsage,
    },
    alerts: [], // Will be populated from logs in future
  });
}
