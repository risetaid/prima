import { createApiHandler } from "@/lib/api-helpers";
import { redis } from "@/lib/redis";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import * as os from "os";

// Calculate CPU usage percentage
function getCPUUsage(): { percent: number; cores: number } {
  const cpus = os.cpus();
  const cores = cpus.length;

  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cores;
  const total = totalTick / cores;
  const percent = 100 - Math.round((idle / total) * 100);

  return { percent, cores };
}

// Get memory usage
function getMemoryUsage(): {
  used: number;
  total: number;
  percent: number;
  heapUsed: number;
  heapTotal: number;
} {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = process.memoryUsage();

  return {
    used: Math.round(usedMem / 1024 / 1024), // MB
    total: Math.round(totalMem / 1024 / 1024), // MB
    percent: Math.round((usedMem / totalMem) * 100),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
  };
}

// GET /api/health - Health check endpoint for system monitoring
export const GET = createApiHandler(
  { auth: "optional" }, // Health check should be accessible without auth
  async () => {
    const checks = {
      redis: {
        status: "unknown" as "healthy" | "unhealthy" | "unknown" | "degraded",
        latency: 0,
        message: "",
        circuitBreaker: undefined as
          | ReturnType<typeof redis.getStatus>["circuitBreaker"],
      },
      database: {
        status: "unknown" as "healthy" | "unhealthy" | "unknown",
        latency: 0,
        message: "",
      },
    };

    // Get system metrics
    const cpu = getCPUUsage();
    const memory = getMemoryUsage();
    const uptime = process.uptime(); // seconds

    // Test Redis with latency measurement
    try {
      const start = Date.now();
      const pingResult = await redis.ping();
      const latency = Date.now() - start;

      // Get Redis status including circuit breaker
      const redisStatus = redis.getStatus();

      if (pingResult.success) {
        let status: "healthy" | "unhealthy" | "degraded" = "healthy";
        let message = "Redis connected and responding";

        // Check circuit breaker state
        if (redisStatus.circuitBreaker) {
          if (redisStatus.circuitBreaker.isOpen) {
            status = "unhealthy";
            message = "Redis circuit breaker is OPEN";
          } else if (redisStatus.circuitBreaker.isHalfOpen) {
            status = "degraded";
            message = "Redis circuit breaker is HALF-OPEN (testing recovery)";
          } else if (redisStatus.circuitBreaker.failureCount > 0) {
            status = "degraded";
            message = `Redis recovering (${redisStatus.circuitBreaker.failureCount} recent failures)`;
          }
        }

        checks.redis = {
          status,
          latency,
          message,
          circuitBreaker: redisStatus.circuitBreaker,
        };
      } else {
        checks.redis = {
          status: "unhealthy",
          latency,
          message: "Redis ping failed",
          circuitBreaker: redisStatus.circuitBreaker,
        };
      }
    } catch (error) {
      checks.redis = {
        status: "unhealthy",
        latency: 0,
        message:
          error instanceof Error ? error.message : "Redis connection failed",
        circuitBreaker: redis.getStatus().circuitBreaker,
      };
    }

    // Test Database with latency measurement
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      const latency = Date.now() - start;

      checks.database = {
        status: "healthy",
        latency,
        message: "Database connected and responding",
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        latency: 0,
        message:
          error instanceof Error ? error.message : "Database connection failed",
      };
    }

    // Determine overall status
    const overallStatus =
      checks.redis.status === "healthy" && checks.database.status === "healthy"
        ? "healthy"
        : checks.redis.status === "unhealthy" ||
          checks.database.status === "unhealthy"
        ? "unhealthy"
        : "degraded";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        cpu: {
          percent: cpu.percent,
          cores: cpu.cores,
        },
        memory: {
          usedMB: memory.used,
          totalMB: memory.total,
          percent: memory.percent,
          heapUsedMB: memory.heapUsed,
          heapTotalMB: memory.heapTotal,
        },
        uptime: Math.round(uptime), // seconds
      },
      info: {
        plan: "Railway Pro",
        environment: process.env.NODE_ENV || "unknown",
        region: process.env.RAILWAY_REGION || "unknown",
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
      },
    };
  }
);
