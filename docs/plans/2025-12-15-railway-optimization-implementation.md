# PRIMA Railway Optimization - Implementation Plan

> **For Droid:** REQUIRED SUB-SKILL: Use `executing-plans` skill to implement this plan task-by-task.

**Goal:** Zero-downtime production optimization for PRIMA on Railway with security hardening, performance improvements, and database tuning via feature flags.

**Architecture:** Three-layer safety system: (1) Feature flags for instant rollback, (2) Observability layer for monitoring, (3) Gradual rollout per phase with 72h monitoring windows. All changes backward-compatible.

**Tech Stack:** TypeScript, Next.js 15, Drizzle ORM, Redis (ioredis), PostgreSQL, Railway deployment

---

## Phase 0: Infrastructure Setup (Week 1)

### Task 1: Feature Flag System - Core Infrastructure

**Files:**
- Create: `src/lib/feature-flags.ts`
- Create: `src/lib/feature-flag-config.ts`
- Create: `tests/lib/feature-flags.test.ts`

#### Step 1: Write failing test for feature flag system

Create test file:

```typescript
// tests/lib/feature-flags.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureFlags } from '@/lib/feature-flags';

describe('FeatureFlags', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should default to false when flag not set', () => {
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should return true when flag set to true', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'true';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(true);
  });

  it('should return false when flag set to false', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'false';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should handle invalid flag values gracefully', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'invalid';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should track flag metadata', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'true';
    const flags = new FeatureFlags();
    const metadata = flags.getMetadata('SECURITY_ATOMIC_IDEMPOTENCY');
    
    expect(metadata.enabled).toBe(true);
    expect(metadata.enabledAt).toBeInstanceOf(Date);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `bun test tests/lib/feature-flags.test.ts`
Expected: FAIL with "Cannot find module '@/lib/feature-flags'"

#### Step 3: Implement feature flag config

Create config file:

```typescript
// src/lib/feature-flag-config.ts
/**
 * Feature flag definitions for PRIMA Railway optimization
 * All flags default to false for safety
 */

export type FlagCategory = 'SECURITY' | 'PERFORMANCE' | 'DATABASE' | 'OBSERVABILITY';

export interface FlagDefinition {
  name: string;
  category: FlagCategory;
  description: string;
  defaultEnabled: boolean;
}

export const FLAG_DEFINITIONS: Record<string, FlagDefinition> = {
  // Phase 1: Security Fixes
  SECURITY_ATOMIC_IDEMPOTENCY: {
    name: 'SECURITY_ATOMIC_IDEMPOTENCY',
    category: 'SECURITY',
    description: 'Use atomic Redis SET NX EX for idempotency checks',
    defaultEnabled: false,
  },
  SECURITY_STRICT_ENV_VALIDATION: {
    name: 'SECURITY_STRICT_ENV_VALIDATION',
    category: 'SECURITY',
    description: 'Enforce strict environment variable validation on startup',
    defaultEnabled: false,
  },
  SECURITY_TIMING_SAFE_AUTH: {
    name: 'SECURITY_TIMING_SAFE_AUTH',
    category: 'SECURITY',
    description: 'Use timing-safe comparison for API key validation',
    defaultEnabled: false,
  },
  SECURITY_SAFE_ROLE_DEMOTION: {
    name: 'SECURITY_SAFE_ROLE_DEMOTION',
    category: 'SECURITY',
    description: 'Fix privilege escalation bug in role demotion logic',
    defaultEnabled: false,
  },

  // Phase 2: Performance Optimizations
  PERF_OPTIMIZED_POOL: {
    name: 'PERF_OPTIMIZED_POOL',
    category: 'PERFORMANCE',
    description: 'Use optimized database connection pool settings',
    defaultEnabled: false,
  },
  PERF_WHATSAPP_RETRY: {
    name: 'PERF_WHATSAPP_RETRY',
    category: 'PERFORMANCE',
    description: 'Enable retry logic with exponential backoff for WhatsApp sends',
    defaultEnabled: false,
  },
  PERF_BATCH_CLEANUP: {
    name: 'PERF_BATCH_CLEANUP',
    category: 'PERFORMANCE',
    description: 'Use batch operations for conversation cleanup',
    defaultEnabled: false,
  },
  PERF_PAGINATION_BOUNDS: {
    name: 'PERF_PAGINATION_BOUNDS',
    category: 'PERFORMANCE',
    description: 'Enforce pagination bounds to prevent DoS',
    defaultEnabled: false,
  },
  PERF_GRACEFUL_SHUTDOWN: {
    name: 'PERF_GRACEFUL_SHUTDOWN',
    category: 'PERFORMANCE',
    description: 'Enable graceful shutdown on SIGTERM/SIGINT',
    defaultEnabled: false,
  },

  // Phase 3: Database Optimizations
  DATABASE_OPTIMIZED_QUERIES: {
    name: 'DATABASE_OPTIMIZED_QUERIES',
    category: 'DATABASE',
    description: 'Use optimized queries with new composite indexes',
    defaultEnabled: false,
  },
};
```

#### Step 4: Implement feature flag system

Create implementation:

```typescript
// src/lib/feature-flags.ts
import { logger } from '@/lib/logger';
import { FLAG_DEFINITIONS, FlagDefinition } from './feature-flag-config';

export interface FlagMetadata {
  enabled: boolean;
  rolloutPercentage: number;
  enabledAt: Date | null;
  definition: FlagDefinition;
}

export class FeatureFlags {
  private flags: Map<string, boolean>;
  private metadata: Map<string, FlagMetadata>;

  constructor() {
    this.flags = new Map();
    this.metadata = new Map();
    this.initialize();
  }

  private initialize(): void {
    // Load all flag definitions
    Object.entries(FLAG_DEFINITIONS).forEach(([key, definition]) => {
      const envKey = `FEATURE_FLAG_${key}`;
      const envValue = process.env[envKey];
      
      let enabled = definition.defaultEnabled;
      
      if (envValue !== undefined) {
        if (envValue === 'true') {
          enabled = true;
        } else if (envValue === 'false') {
          enabled = false;
        } else {
          logger.warn(`Invalid feature flag value for ${key}: ${envValue}, defaulting to false`);
          enabled = false;
        }
      }

      this.flags.set(key, enabled);
      this.metadata.set(key, {
        enabled,
        rolloutPercentage: enabled ? 100 : 0,
        enabledAt: enabled ? new Date() : null,
        definition,
      });

      if (enabled) {
        logger.info(`Feature flag enabled: ${key}`, { flag: key, category: definition.category });
      }
    });
  }

  /**
   * Check if a feature flag is enabled
   * Returns false for unknown flags (safe default)
   */
  public isEnabled(flagName: string): boolean {
    try {
      return this.flags.get(flagName) ?? false;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}`, error instanceof Error ? error : undefined);
      return false; // Fail closed
    }
  }

  /**
   * Get metadata for a feature flag
   */
  public getMetadata(flagName: string): FlagMetadata | null {
    return this.metadata.get(flagName) ?? null;
  }

  /**
   * Get all enabled flags
   */
  public getEnabledFlags(): string[] {
    return Array.from(this.flags.entries())
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
  }

  /**
   * Get all flag metadata for monitoring dashboard
   */
  public getAllMetadata(): Record<string, FlagMetadata> {
    const result: Record<string, FlagMetadata> = {};
    this.metadata.forEach((metadata, key) => {
      result[key] = metadata;
    });
    return result;
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlags();
```

#### Step 5: Run tests to verify they pass

Run: `bun test tests/lib/feature-flags.test.ts`
Expected: All tests PASS

#### Step 6: Commit

```bash
git add src/lib/feature-flags.ts src/lib/feature-flag-config.ts tests/lib/feature-flags.test.ts
git commit -m "feat: add feature flag system for zero-downtime deployments

- Core FeatureFlags class with runtime evaluation
- Flag definitions for all phases (security, performance, database)
- Safe defaults (all flags false)
- Metadata tracking for monitoring
- Comprehensive test coverage

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

### Task 2: Enhanced Observability - Metrics Collection

**Files:**
- Create: `src/lib/metrics.ts`
- Create: `tests/lib/metrics.test.ts`
- Modify: `src/lib/logger.ts`

#### Step 1: Write failing test for metrics system

```typescript
// tests/lib/metrics.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector, MetricType } from '@/lib/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should increment counter metrics', () => {
    metrics.increment('whatsapp.send.success');
    metrics.increment('whatsapp.send.success');
    
    const value = metrics.getCounter('whatsapp.send.success');
    expect(value).toBe(2);
  });

  it('should record histogram values', () => {
    metrics.recordHistogram('api.latency', 100);
    metrics.recordHistogram('api.latency', 200);
    metrics.recordHistogram('api.latency', 150);
    
    const stats = metrics.getHistogramStats('api.latency');
    expect(stats.count).toBe(3);
    expect(stats.p50).toBeGreaterThan(0);
    expect(stats.p95).toBeGreaterThan(0);
  });

  it('should set gauge values', () => {
    metrics.setGauge('db.pool.active', 5);
    metrics.setGauge('db.pool.active', 8);
    
    const value = metrics.getGauge('db.pool.active');
    expect(value).toBe(8);
  });

  it('should export metrics as JSON', () => {
    metrics.increment('test.counter');
    metrics.setGauge('test.gauge', 42);
    
    const exported = metrics.exportMetrics();
    expect(exported.counters['test.counter']).toBe(1);
    expect(exported.gauges['test.gauge']).toBe(42);
  });

  it('should reset metrics after export', () => {
    metrics.increment('test.counter');
    metrics.exportMetrics();
    
    const value = metrics.getCounter('test.counter');
    expect(value).toBe(0);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `bun test tests/lib/metrics.test.ts`
Expected: FAIL with "Cannot find module '@/lib/metrics'"

#### Step 3: Implement metrics collection system

```typescript
// src/lib/metrics.ts
import { logger } from '@/lib/logger';

export enum MetricType {
  COUNTER = 'counter',
  HISTOGRAM = 'histogram',
  GAUGE = 'gauge',
}

export interface HistogramStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  histograms: Record<string, HistogramStats>;
  gauges: Record<string, number>;
}

export class MetricsCollector {
  private counters: Map<string, number>;
  private histograms: Map<string, number[]>;
  private gauges: Map<string, number>;
  private lastExportTime: number;

  constructor() {
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.lastExportTime = Date.now();
  }

  /**
   * Increment a counter metric
   */
  public increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a histogram value (for latency, sizes, etc.)
   */
  public recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
  }

  /**
   * Set a gauge value (for current state metrics)
   */
  public setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Get current counter value
   */
  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get current gauge value
   */
  public getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Calculate histogram statistics
   */
  public getHistogramStats(name: string): HistogramStats | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const min = sorted[0];
    const max = sorted[count - 1];

    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, sum, min, max, p50, p95, p99 };
  }

  /**
   * Export all metrics as JSON and reset counters/histograms
   * Gauges are NOT reset (they represent current state)
   */
  public exportMetrics(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      counters: {},
      histograms: {},
      gauges: {},
    };

    // Export counters
    this.counters.forEach((value, key) => {
      snapshot.counters[key] = value;
    });

    // Export histograms with stats
    this.histograms.forEach((values, key) => {
      const stats = this.getHistogramStats(key);
      if (stats) {
        snapshot.histograms[key] = stats;
      }
    });

    // Export gauges
    this.gauges.forEach((value, key) => {
      snapshot.gauges[key] = value;
    });

    // Reset counters and histograms after export
    this.counters.clear();
    this.histograms.clear();
    // Gauges are NOT cleared

    this.lastExportTime = Date.now();

    return snapshot;
  }

  /**
   * Start periodic export to logs (every 60 seconds)
   */
  public startPeriodicExport(intervalMs: number = 60000): NodeJS.Timeout {
    const interval = setInterval(() => {
      const snapshot = this.exportMetrics();
      logger.info('Metrics snapshot', {
        operation: 'metrics.export',
        metrics: snapshot,
      });
    }, intervalMs);

    return interval;
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

// Start periodic export in production
if (process.env.NODE_ENV === 'production') {
  metrics.startPeriodicExport();
}
```

#### Step 4: Enhance logger with alert level

Modify `src/lib/logger.ts`:

```typescript
// Add to LogLevel enum (after line 8)
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  ALERT = "alert",  // ADD THIS LINE
}

// Add alert method to Logger class (after line 110)
  alert(message: string, context?: LogContext): void {
    // Alert is like error but for critical production issues
    this.log(LogLevel.ERROR, `🚨 ALERT: ${message}`, context);
  }
```

#### Step 5: Run tests to verify they pass

Run: `bun test tests/lib/metrics.test.ts`
Expected: All tests PASS

#### Step 6: Commit

```bash
git add src/lib/metrics.ts tests/lib/metrics.test.ts src/lib/logger.ts
git commit -m "feat: add metrics collection system for observability

- Counter, histogram, and gauge metrics
- Automatic percentile calculation (p50, p95, p99)
- Periodic export to structured logs (60s intervals)
- Add ALERT log level for critical issues
- Comprehensive test coverage

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

### Task 3: Health Check Enhancements

**Files:**
- Modify: `src/app/api/health/route.ts`
- Create: `src/app/api/health/ready/route.ts`
- Create: `src/app/api/health/metrics/route.ts`

#### Step 1: Write failing test for readiness check

```typescript
// tests/app/api/health/ready.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/health/ready/route';
import { NextRequest } from 'next/server';

describe('/api/health/ready', () => {
  it('should return 200 when all services are ready', async () => {
    const request = new NextRequest('http://localhost:3000/api/health/ready');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ready');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('redis');
    expect(data.checks).toHaveProperty('gowa');
  });
});
```

#### Step 2: Run test to verify it fails

Run: `bun test tests/app/api/health/ready.test.ts`
Expected: FAIL with "Cannot find module"

#### Step 3: Implement readiness check endpoint

```typescript
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
```

#### Step 4: Implement metrics endpoint (internal only)

```typescript
// src/app/api/health/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";
import { featureFlags } from "@/lib/feature-flags";
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
      ip: req.ip,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = metrics.exportMetrics();

  return NextResponse.json({
    timestamp: snapshot.timestamp,
    metrics: snapshot,
    feature_flags: featureFlags.getAllMetadata(),
  });
}
```

#### Step 5: Run tests and verify basic health endpoint still works

Run: `bun test tests/app/api/health/ready.test.ts`
Expected: Tests PASS

Test manually:
```bash
curl http://localhost:3000/api/health/ready
```

#### Step 6: Commit

```bash
git add src/app/api/health/ready/route.ts src/app/api/health/metrics/route.ts tests/app/api/health/ready.test.ts
git commit -m "feat: add enhanced health check endpoints

- /api/health/ready for Kubernetes-style readiness probes
- Check database, Redis, and GOWA connectivity
- /api/health/metrics for internal monitoring (requires API key)
- Export metrics snapshot and feature flag status

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

### Task 4: Migration Health Dashboard

**Files:**
- Create: `src/app/api/admin/migration-health/route.ts`

#### Step 1: Write minimal test for admin dashboard

```typescript
// tests/app/api/admin/migration-health.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/admin/migration-health/route';
import { NextRequest } from 'next/server';

describe('/api/admin/migration-health', () => {
  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/migration-health');
    const response = await GET(request);

    // Will return 401 or redirect to login
    expect([401, 302, 307]).toContain(response.status);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `bun test tests/app/api/admin/migration-health.test.ts`
Expected: FAIL

#### Step 3: Implement migration health dashboard

```typescript
// src/app/api/admin/migration-health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { metrics } from "@/lib/metrics";
import { featureFlags } from "@/lib/feature-flags";
import { redis } from "@/lib/redis";

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
    const result = await db.execute`
      SELECT 
        indexrelname as index_name,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      AND indexrelname LIKE '%conversation%'
      ORDER BY idx_scan DESC
    `;
    
    return result.rows;
  } catch (error) {
    return [];
  }
}

export async function GET(req: NextRequest) {
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
```

#### Step 4: Run test to verify it passes

Run: `bun test tests/app/api/admin/migration-health.test.ts`
Expected: Test PASS (returns 401 for unauthenticated)

#### Step 5: Commit Phase 0 completion

```bash
git add src/app/api/admin/migration-health/route.ts tests/app/api/admin/migration-health.test.ts
git commit -m "feat: add migration health monitoring dashboard

- Admin-only endpoint for tracking optimization rollout
- Feature flag status and metadata
- Metrics snapshot (counters, histograms, gauges)
- Database health (connection pool, index usage)
- Foundation for comparative metrics (old vs new)

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

## Phase 1: Critical Security Fixes (Week 2)

### Task 5: Atomic Idempotency Fix

**Files:**
- Modify: `src/lib/idempotency.ts`
- Modify: `tests/lib/idempotency.test.ts` (if exists, otherwise create)

#### Step 1: Write failing test for atomic idempotency

```typescript
// tests/lib/idempotency.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDuplicateEvent } from '@/lib/idempotency';
import { redis } from '@/lib/redis';

describe('isDuplicateEvent', () => {
  const testKey = 'test:event:123';

  afterEach(async () => {
    // Cleanup
    await redis.del(testKey);
  });

  it('should return false for first event', async () => {
    const isDuplicate = await isDuplicateEvent(testKey);
    expect(isDuplicate).toBe(false);
  });

  it('should return true for duplicate event', async () => {
    await isDuplicateEvent(testKey);
    const isDuplicate = await isDuplicateEvent(testKey);
    expect(isDuplicate).toBe(true);
  });

  it('should handle concurrent requests atomically', async () => {
    // Simulate 10 concurrent requests with same event ID
    const promises = Array(10).fill(null).map(() => 
      isDuplicateEvent(testKey)
    );
    
    const results = await Promise.all(promises);
    
    // Exactly one should return false (first), others true (duplicates)
    const firstEvents = results.filter(r => r === false);
    expect(firstEvents.length).toBe(1);
  });

  it('should expire after TTL', async () => {
    const shortTTL = 1; // 1 second
    await isDuplicateEvent(testKey, shortTTL);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const isDuplicate = await isDuplicateEvent(testKey);
    expect(isDuplicate).toBe(false);
  });

  it('should fail closed on Redis error', async () => {
    // Mock Redis error
    const originalSet = redis.set;
    redis.set = vi.fn().mockRejectedValue(new Error('Redis down'));
    
    const isDuplicate = await isDuplicateEvent(testKey);
    expect(isDuplicate).toBe(true); // Fail closed
    
    redis.set = originalSet;
  });
});
```

#### Step 2: Run test to verify concurrent test fails with current implementation

Run: `bun test tests/lib/idempotency.test.ts`
Expected: "concurrent requests atomically" test FAILS (race condition allows duplicates)

#### Step 3: Implement atomic idempotency with feature flag

```typescript
// src/lib/idempotency.ts (replace entire file)
import { createHash } from 'crypto'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { featureFlags } from '@/lib/feature-flags'
import { metrics } from '@/lib/metrics'

/**
 * Check if an event is a duplicate using idempotency key
 * 
 * LEGACY (race condition): Uses exists() + set() - gap allows duplicates
 * NEW (atomic): Uses SET NX EX - atomic operation prevents race condition
 * 
 * Controlled by feature flag: SECURITY_ATOMIC_IDEMPOTENCY
 */
export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    if (featureFlags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')) {
      // NEW IMPLEMENTATION: Atomic SET NX EX
      // Returns null if key already exists (duplicate)
      // Returns "OK" if key was set (first time)
      const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      const isDuplicate = result === null;
      
      // Track metrics
      metrics.increment('idempotency.check.atomic');
      if (isDuplicate) {
        metrics.increment('idempotency.duplicate_detected.atomic');
      }
      
      logger.debug('Atomic idempotency check', {
        operation: 'idempotency.check',
        key,
        isDuplicate,
        implementation: 'atomic',
        duration_ms: Date.now() - startTime,
      });
      
      return isDuplicate;
    } else {
      // LEGACY IMPLEMENTATION: Race condition exists
      const exists = await redis.exists(key);
      if (exists) {
        metrics.increment('idempotency.check.legacy');
        metrics.increment('idempotency.duplicate_detected.legacy');
        return true;
      }
      
      await redis.set(key, '1', ttlSeconds);
      metrics.increment('idempotency.check.legacy');
      
      logger.debug('Legacy idempotency check', {
        operation: 'idempotency.check',
        key,
        isDuplicate: false,
        implementation: 'legacy',
        duration_ms: Date.now() - startTime,
      });
      
      return false;
    }
  } catch (error) {
    // Fail closed: If Redis is unavailable, treat as duplicate to be safe
    logger.error('Idempotency check failed - rejecting to be safe', 
      error instanceof Error ? error : undefined,
      {
        operation: 'idempotency.check',
        key,
      }
    );
    metrics.increment('idempotency.error');
    return true; // Fail closed, not open
  }
}

export function hashFallbackId(parts: (string | undefined)[]): string {
  const h = createHash('sha1')
  h.update(parts.filter(Boolean).join('|'))
  return h.digest('hex')
}
```

#### Step 4: Run tests to verify they pass

Run: `bun test tests/lib/idempotency.test.ts`
Expected: All tests PASS including concurrent test

#### Step 5: Verify in webhook handler (no changes needed, just verify)

Read `src/app/api/webhooks/gowa/route.ts` and confirm it uses `isDuplicateEvent`.

#### Step 6: Commit

```bash
git add src/lib/idempotency.ts tests/lib/idempotency.test.ts
git commit -m "fix: atomic idempotency check to prevent race condition

CRITICAL FIX: Race condition between redis.exists() and redis.set() 
allowed duplicate WhatsApp messages to patients.

Solution: Use atomic Redis SET NX EX operation.

- New implementation behind SECURITY_ATOMIC_IDEMPOTENCY flag
- Legacy implementation preserved for rollback
- Fail closed on Redis errors (reject duplicates)
- Track both implementations in metrics
- Comprehensive test including concurrency test

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

### Task 6: Environment Variable Validation

**Files:**
- Create: `src/lib/env-validator.ts`
- Create: `tests/lib/env-validator.test.ts`
- Modify: `src/lib/gowa.ts`

#### Step 1: Write failing test for env validation

```typescript
// tests/lib/env-validator.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateRequiredEnv, validateOptionalEnv } from '@/lib/env-validator';

describe('Environment Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateRequiredEnv', () => {
    it('should pass when all required vars are set', () => {
      process.env.DATABASE_URL = 'postgres://localhost';
      process.env.CLERK_SECRET_KEY = 'test_key_fake';
      process.env.GOWA_ENDPOINT = 'http://localhost:3000';
      process.env.GOWA_WEBHOOK_SECRET = 'test_webhook_fake';
      process.env.INTERNAL_API_KEY = 'test_api_fake';

      expect(() => validateRequiredEnv()).not.toThrow();
    });

    it('should throw when required var is missing', () => {
      delete process.env.GOWA_WEBHOOK_SECRET;

      expect(() => validateRequiredEnv()).toThrow('Missing required environment variables');
    });

    it('should throw when required var is empty string', () => {
      process.env.GOWA_WEBHOOK_SECRET = '';

      expect(() => validateRequiredEnv()).toThrow('Missing required environment variables');
    });
  });

  describe('validateOptionalEnv', () => {
    it('should warn but not throw for missing optional vars', () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => validateOptionalEnv()).not.toThrow();
    });
  });
});
```

#### Step 2: Run test to verify it fails

Run: `bun test tests/lib/env-validator.test.ts`
Expected: FAIL

#### Step 3: Implement environment validator

```typescript
// src/lib/env-validator.ts
import { logger } from '@/lib/logger';
import { featureFlags } from '@/lib/feature-flags';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'GOWA_ENDPOINT',
  'GOWA_WEBHOOK_SECRET',
  'INTERNAL_API_KEY',
  'REDIS_URL',
] as const;

const OPTIONAL_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
] as const;

/**
 * Validate required environment variables
 * Throws error if any required var is missing or empty
 */
export function validateRequiredEnv(): void {
  // Only enforce if flag is enabled
  if (!featureFlags.isEnabled('SECURITY_STRICT_ENV_VALIDATION')) {
    return;
  }

  const missing: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('Environment validation failed', error, {
      operation: 'env.validation',
      missing,
    });
    throw error;
  }

  logger.info('Environment validation passed', {
    operation: 'env.validation',
    required_vars: REQUIRED_ENV_VARS.length,
  });
}

/**
 * Validate optional environment variables
 * Warns if missing but doesn't throw
 */
export function validateOptionalEnv(): void {
  const missing: string[] = [];

  for (const varName of OPTIONAL_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    logger.warn('Optional environment variables not configured', {
      operation: 'env.validation',
      missing,
    });
  }
}

/**
 * Run all environment validation
 * Call this on application startup
 */
export function validateEnvironment(): void {
  validateRequiredEnv();
  validateOptionalEnv();
}
```

#### Step 4: Remove hardcoded defaults from gowa.ts

Modify `src/lib/gowa.ts`:

```typescript
// Replace lines 7-13 with:
const GOWA_ENDPOINT = process.env.GOWA_ENDPOINT;
const GOWA_BASIC_AUTH_USER = process.env.GOWA_BASIC_AUTH_USER;
const GOWA_BASIC_AUTH_PASSWORD = process.env.GOWA_BASIC_AUTH_PASSWORD;
const GOWA_WEBHOOK_SECRET = process.env.GOWA_WEBHOOK_SECRET;

// Remove the ALLOW_UNSIGNED_WEBHOOKS default fallback
const ALLOW_UNSIGNED_WEBHOOKS = process.env.ALLOW_UNSIGNED_WEBHOOKS === "true";

// Add validation check at top of file (after imports)
if (!GOWA_ENDPOINT || !GOWA_WEBHOOK_SECRET) {
  logger.error('GOWA configuration incomplete', undefined, {
    has_endpoint: !!GOWA_ENDPOINT,
    has_secret: !!GOWA_WEBHOOK_SECRET,
  });
}
```

#### Step 5: Run tests to verify they pass

Run: `bun test tests/lib/env-validator.test.ts`
Expected: All tests PASS

#### Step 6: Add validation call to application startup

Create `src/instrumentation.ts` (Next.js 15 startup hook):

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./lib/env-validator');
    
    try {
      validateEnvironment();
    } catch (error) {
      // Log but don't crash in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }
}
```

#### Step 7: Commit

```bash
git add src/lib/env-validator.ts tests/lib/env-validator.test.ts src/lib/gowa.ts src/instrumentation.ts
git commit -m "fix: remove hardcoded secrets and add strict env validation

SECURITY FIX: Remove default values for sensitive credentials.

- No more default 'secret' for GOWA_WEBHOOK_SECRET
- No more default 'admin' for GOWA_BASIC_AUTH_USER
- ALLOW_UNSIGNED_WEBHOOKS no longer defaults to true
- Strict validation behind SECURITY_STRICT_ENV_VALIDATION flag
- Validation runs on app startup via instrumentation.ts
- Fail fast in production, warn in development

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

---

## IMPORTANT: Implementation Continues

This plan contains **23 total tasks** across all phases. The remaining tasks follow the same TDD pattern:

### Phase 1 (Remaining):
- Task 7: Timing-Safe API Key Comparison
- Task 8: Privilege Escalation Fix

### Phase 2 (Week 3-4):
- Task 9: Database Connection Pool Tuning
- Task 10: WhatsApp Retry Logic with Circuit Breaker
- Task 11: Batch Operations for Cleanup
- Task 12: Pagination Bounds Protection
- Task 13: Graceful Shutdown Handler

### Phase 3 (Week 5):
- Task 14: Generate Migration for Composite Indexes
- Task 15: Manually Edit SQL to Add CONCURRENTLY
- Task 16: Apply Indexes to Staging
- Task 17: Apply Indexes to Production
- Task 18: Unbounded Query Fix
- Task 19: Cache Key Collision Fix
- Task 20: Schema Type Fix

### Phase 4 (Week 6):
- Task 21: ESLint Cleanup
- Task 22: Security Hardening (File Upload, CSRF, Debug Endpoints)
- Task 23: Comprehensive Testing Suite

**Each task follows the same structure:**
1. Write failing test
2. Run test to verify failure
3. Implement minimal code
4. Run test to verify pass
5. Commit with descriptive message

---

## Rollout & Monitoring Protocol

After implementation, follow this rollout sequence:

### Week 1: Baseline Establishment
```bash
# Deploy Phase 0 with all flags disabled
# Monitor for 7 days to establish baseline metrics
```

### Week 2: Phase 1 Rollout
```bash
# Enable flags one at a time with 72h monitoring:
FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true      # Monitor 72h
FEATURE_FLAG_SECURITY_STRICT_ENV_VALIDATION=true   # Monitor 48h
FEATURE_FLAG_SECURITY_TIMING_SAFE_AUTH=true        # Monitor 48h
FEATURE_FLAG_SECURITY_SAFE_ROLE_DEMOTION=true      # Monitor 24h
```

### Week 3-4: Phase 2 Rollout
```bash
# Enable performance optimizations sequentially
FEATURE_FLAG_PERF_OPTIMIZED_POOL=true        # Monitor 72h
FEATURE_FLAG_PERF_WHATSAPP_RETRY=true        # Monitor 72h
FEATURE_FLAG_PERF_BATCH_CLEANUP=true         # Monitor 48h
FEATURE_FLAG_PERF_PAGINATION_BOUNDS=true     # Monitor 48h
FEATURE_FLAG_PERF_GRACEFUL_SHUTDOWN=true     # Test + Monitor 48h
```

### Week 5: Phase 3 Database Optimizations
```bash
# Apply indexes with CONCURRENTLY (no feature flag needed for indexes)
# Enable query optimizations:
FEATURE_FLAG_DATABASE_OPTIMIZED_QUERIES=true  # Monitor 72h
```

### Week 6: Validation & Cleanup
```bash
# Run comprehensive test suite
bun run test:comprehensive

# If stable for 2+ weeks, remove flags and old code
# Document improvements in CLAUDE.md
```

---

## Monitoring Checklist

**Daily (First 2 Weeks):**
- [ ] Check `/api/admin/migration-health` dashboard
- [ ] Review Railway logs for ALERT level entries
- [ ] Compare error rate vs baseline
- [ ] Compare p95 latency vs baseline
- [ ] Verify connection pool not exhausted

**Weekly:**
- [ ] Trend analysis: improvements sustained?
- [ ] Memory usage (Railway graphs)
- [ ] User-reported issues
- [ ] Index usage stats (pg_stat_user_indexes)

**Rollback Triggers:**
- Error rate >1% → Disable feature flag immediately
- p95 latency >2x baseline → Disable feature flag
- Connection exhaustion → Revert to old pool settings
- Any critical user-facing issue → Rollback

---

## Success Metrics (Week 1 → Week 6)

| Metric | Baseline (TBD) | Target | 
|--------|----------------|--------|
| Error Rate | TBD | <0.5% |
| API p95 Latency | TBD | <500ms |
| WhatsApp Success Rate | TBD | >98% |
| DB Connection Exhaustion | TBD | <5 events/day |
| Duplicate Messages | TBD | 0 |
| Cleanup Job Duration | TBD | <5 seconds |
| Index Scans | N/A | >1000/day |

---

## Notes for Implementation

**TDD Discipline:**
- Every change MUST have tests first
- Run tests before AND after changes
- No skipping RED-GREEN cycle

**Feature Flag Discipline:**
- All optimizations wrapped in flags
- Default to false (old behavior)
- Test both code paths

**Commit Discipline:**
- Small, atomic commits per step
- Clear commit messages with context
- Co-author credit for droid

**Monitoring Discipline:**
- Track both old and new implementations
- Compare metrics side-by-side
- Document baseline before any change

---

**This implementation plan is ready for execution via subagent-driven-development or executing-plans skill.**
