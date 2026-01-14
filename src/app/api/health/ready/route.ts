// src/app/api/health/ready/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Timeouts for individual health checks
const HEALTH_CHECK_TIMEOUT_MS = 2000; // 2s per check
const OVERALL_TIMEOUT_MS = 3000; // 3s max for entire response

interface HealthCheck {
  healthy: boolean;
  latency_ms: number;
  error?: string;
}

interface ReadinessResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    gowa: HealthCheck;
    anthropic: HealthCheck;
    minio: HealthCheck;
  };
}

/**
 * Get error message for HTTP response
 */
function getHttpErrorMessage(status: number): string {
  if (status === 401) {
    return "Invalid API key";
  }
  return `HTTP ${status}`;
}

/**
 * Create a timed health check with timeout
 */
function createTimedCheck(
  name: string,
  checkFn: () => Promise<HealthCheck>
): Promise<HealthCheck> {
  return Promise.race([
    checkFn().then((result) => ({ ...result, check: name })),
    new Promise<HealthCheck>((resolve) => {
      setTimeout(() => {
        resolve({
          healthy: false,
          latency_ms: HEALTH_CHECK_TIMEOUT_MS,
          error: `${name} check timed out`,
        });
      }, HEALTH_CHECK_TIMEOUT_MS);
    }),
  ]);
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to verify DB connectivity
    await db.execute(sql`SELECT 1`);
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
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

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

async function checkAnthropic(): Promise<HealthCheck> {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      healthy: false,
      latency_ms: 0,
      error: "ANTHROPIC_API_KEY not configured",
    };
  }

  try {
    // Use GET on a lightweight endpoint to verify connectivity and key validity
    // The /v1/models endpoint returns available models without consuming tokens
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    clearTimeout(timeout);

    return {
      healthy: response.ok,
      latency_ms: Date.now() - start,
      error: response.ok ? undefined : getHttpErrorMessage(response.status),
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkMinIO(): Promise<HealthCheck> {
  const start = Date.now();
  const endpoint = process.env.MINIO_ENDPOINT;

  if (!endpoint) {
    return {
      healthy: false,
      latency_ms: 0,
      error: "MINIO_ENDPOINT not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    // MinIO health check endpoint
    const response = await fetch(`${endpoint}/minio/health/live`, {
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
  const startTime = Date.now();

  // Create individual check promises with timeout
  const checks = {
    database: createTimedCheck("database", checkDatabase),
    redis: createTimedCheck("redis", checkRedis),
    gowa: createTimedCheck("gowa", checkGowa),
    anthropic: createTimedCheck("anthropic", checkAnthropic),
    minio: createTimedCheck("minio", checkMinIO),
  };

  // Wrap entire operation in overall timeout
  const allChecks = Promise.all(
    Object.entries(checks).map(async ([name, promise]) => {
      const result = await promise;
      return [
        name,
        {
          healthy: result.healthy,
          latency_ms: result.latency_ms,
          error: result.error,
        },
      ] as const;
    })
  );

  try {
    const timedChecks = await Promise.race([
      allChecks,
      new Promise<never>((resolve) =>
        setTimeout(() => resolve([] as never), OVERALL_TIMEOUT_MS)
      ),
    ]);

    const checksMap = Object.fromEntries(timedChecks);
    const database = checksMap.database;
    const redis = checksMap.redis;
    const gowa = checksMap.gowa;
    const anthropic = checksMap.anthropic;
    const minio = checksMap.minio;

    const allHealthy =
      database?.healthy &&
      redis?.healthy &&
      gowa?.healthy &&
      anthropic?.healthy &&
      minio?.healthy;

    const response: ReadinessResponse = {
      status: allHealthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: database || { healthy: false, latency_ms: OVERALL_TIMEOUT_MS, error: "Timeout" },
        redis: redis || { healthy: false, latency_ms: OVERALL_TIMEOUT_MS, error: "Timeout" },
        gowa: gowa || { healthy: false, latency_ms: OVERALL_TIMEOUT_MS, error: "Timeout" },
        anthropic: anthropic || { healthy: false, latency_ms: OVERALL_TIMEOUT_MS, error: "Timeout" },
        minio: minio || { healthy: false, latency_ms: OVERALL_TIMEOUT_MS, error: "Timeout" },
      },
    };

    if (!allHealthy) {
      logger.warn("Readiness check failed", {
        operation: "health.ready",
        totalLatencyMs: Date.now() - startTime,
        database: database?.healthy,
        redis: redis?.healthy,
        gowa: gowa?.healthy,
        anthropic: anthropic?.healthy,
        minio: minio?.healthy,
      });
    }

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
    });
  } catch (error) {
    const response: ReadinessResponse = {
      status: "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: { healthy: false, latency_ms: 0, error: "Health check error" },
        redis: { healthy: false, latency_ms: 0, error: "Health check error" },
        gowa: { healthy: false, latency_ms: 0, error: "Health check error" },
        anthropic: { healthy: false, latency_ms: 0, error: "Health check error" },
        minio: { healthy: false, latency_ms: 0, error: "Health check error" },
      },
    };

    logger.error("Readiness check error", error as Error, {
      operation: "health.ready",
    });

    return NextResponse.json(response, { status: 503 });
  }
}
