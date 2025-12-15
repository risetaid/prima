// src/app/api/health/ready/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthCheck {
  healthy: boolean;
  latency_ms: number;
  error?: string;
}

interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    gowa: HealthCheck;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to verify DB connectivity
    await db.execute`SELECT 1`;
    return {
      healthy: true,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      healthy: true,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkGowa(): Promise<HealthCheck> {
  const start = Date.now();
  const endpoint = process.env.GOWA_ENDPOINT;
  
  if (!endpoint) {
    return {
      healthy: false,
      latency_ms: 0,
      error: "GOWA_ENDPOINT not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${endpoint}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      healthy: response.ok,
      latency_ms: Date.now() - start,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkGowa(),
  ]);

  const [database, redis, gowa] = checks;

  const allHealthy = database.healthy && redis.healthy && gowa.healthy;

  const response: ReadinessResponse = {
    status: allHealthy ? "ready" : "not_ready",
    checks: {
      database,
      redis,
      gowa,
    },
  };

  if (!allHealthy) {
    logger.warn("Readiness check failed", {
      operation: "health.ready",
      database: database.healthy,
      redis: redis.healthy,
      gowa: gowa.healthy,
    });
  }

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}
