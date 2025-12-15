# PRIMA Railway Optimization - Production Deployment Design

**Date**: 2025-12-15  
**Status**: Approved for Implementation  
**Target**: Zero-downtime production deployment with quality focus

---

## Executive Summary

Comprehensive optimization plan for PRIMA healthcare platform running on Railway with active production users. Focus on security hardening, performance optimization, and database tuning while maintaining zero downtime through feature flags and careful migration strategy.

**Context**:
- Production environment with active users
- Zero-downtime requirement (no maintenance windows)
- Online index creation (CONCURRENT) for database changes
- Feature flag approach for Phase 1 security fixes
- Basic logging only (need observability layer setup)

**Timeline**: 6-week flexible schedule prioritizing quality over speed

---

## Architecture Overview

### Three-Layer Safety Architecture

**Layer 1: Feature Flag System**
- Environment-based flags via Railway variables
- Atomic flag checks at runtime
- Default to old behavior (safe fallback)
- Instant rollback capability without redeploy

**Layer 2: Observability Foundation**
- Enhanced structured logging with context fields
- Metrics collection (counters, histograms, gauges)
- Health check endpoints per optimization category
- JSON-formatted logs for Railway aggregation

**Layer 3: Gradual Rollout Strategy**
- Phase 0 (Week 1): Observability + feature flags infrastructure
- Phase 1 (Week 2): Critical security fixes behind flags
- Phase 2 (Week 3-4): Performance optimizations per-module
- Phase 3 (Week 5): Database optimizations (CONCURRENT indexes)
- Phase 4 (Week 6): Cleanup + comprehensive testing

**Migration Safety**: Each phase has rollback plan. Automated rollback triggers on error rate >1% or p95 latency >2x baseline.

---

## Phase 0: Infrastructure Setup (Week 1)

### 0.1 Feature Flag System

**Files**:
- `src/lib/feature-flags.ts` - Core flag system
- `src/lib/feature-flag-config.ts` - Flag definitions & defaults

**Flag Format**: `FEATURE_FLAG_<CATEGORY>_<NAME>=true|false`

**Categories**:
- `SECURITY_*` - Phase 1 critical fixes
- `PERFORMANCE_*` - Phase 2 optimizations
- `DATABASE_*` - Phase 3 schema changes
- `OBSERVABILITY_*` - Monitoring toggles

**Key Features**:
- Runtime evaluation (not build-time)
- Safe defaults (all flags default to `false`)
- Flag metadata tracking (enabled state, rollout percentage, activation timestamp)
- Graceful degradation on evaluation failure

**Example Usage**:
```typescript
if (featureFlags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')) {
  // New atomic implementation
} else {
  // Legacy implementation (current production code)
}
```

### 0.2 Observability Layer

**Enhanced Structured Logging** (`src/lib/logger.ts`):
- Add context fields: `requestId`, `userId`, `patientId`, `operation`, `duration_ms`
- Log levels: `info`, `warn`, `error`, `alert`
- JSON format for Railway log aggregation
- Sampling for high-volume operations (1% for routine WhatsApp sends)

**Metrics Collection** (`src/lib/metrics.ts` - new):
- Counter metrics: Total counts (requests, errors, cache hits/misses)
- Histogram metrics: Latency distributions (p50, p95, p99)
- Gauge metrics: Current state (active connections, queue depth)
- Per-operation tracking: `whatsapp.send`, `db.query`, `cache.get`, `ai.request`
- Logged every 60 seconds as structured JSON

**Health Check Endpoints** (enhance `src/app/api/health/route.ts`):
- `/api/health` - Basic liveness (existing)
- `/api/health/ready` - Readiness check (DB + Redis + GOWA connectivity)
- `/api/health/metrics` - Current metrics snapshot (internal only, requires API key)

**Migration Health Dashboard** (`src/app/api/admin/migration-health/route.ts` - new):
- Compare old vs new implementation metrics
- Flag-specific metrics
- Database health (connection pool, index usage)
- Recent alerts

**Critical Alerts**: Error rate >1%, latency >2x baseline, connection pool exhaustion → `ALERT` level logs

**Baseline Establishment**: Week 1 captures 7-day baseline metrics before any optimization enabled.

---

## Phase 1: Critical Security Fixes (Week 2)

**Deployment**: All fixes deployed with flags **disabled**, then enabled sequentially with monitoring.

### 1.1 Atomic Idempotency Fix

**File**: `src/lib/idempotency.ts`

**Problem**: Race condition between `redis.exists()` and `redis.set()` → duplicate WhatsApp messages

**Solution**: Use atomic Redis `SET key value EX ttl NX` operation
- Returns `null` if key exists (duplicate)
- Returns `"OK"` if set successfully (first time)

**Feature Flag**: `FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY`

**Implementation**:
```typescript
export async function isDuplicateEvent(key: string, ttlSeconds = 86400): Promise<boolean> {
  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === null; // null = duplicate
  } catch {
    logger.error('Idempotency check failed - rejecting to be safe');
    return true; // Fail closed
  }
}
```

**Backward Compatibility**: Keep old implementation in else branch for instant rollback

**Testing**:
- Unit test: Concurrent requests with mocked Redis
- Integration test: 100 concurrent webhook calls with same event ID
- Production canary: Monitor duplicate message rate for 72 hours

**Metrics**:
- `idempotency.check.legacy` vs `idempotency.check.atomic`
- `idempotency.duplicate_detected`
- `idempotency.latency_ms`

### 1.2 Remove Hardcoded Secrets

**File**: `src/lib/gowa.ts`

**Problem**: Default values for sensitive credentials
- `GOWA_WEBHOOK_SECRET` defaults to `"secret"`
- `ALLOW_UNSIGNED_WEBHOOKS` defaults to `true` in non-production
- `GOWA_BASIC_AUTH_USER` defaults to `"admin"`

**Solution**: Create `src/lib/env-validator.ts` for centralized validation
- Remove all default values
- Throw startup error if required secrets missing
- Validate on application startup

**Feature Flag**: `FEATURE_FLAG_SECURITY_STRICT_ENV_VALIDATION`

**Required Secrets** (no defaults):
- `GOWA_WEBHOOK_SECRET`
- `INTERNAL_API_KEY`
- `GOWA_BASIC_AUTH_PASSWORD`

**Optional Secrets** (warn if missing):
- `ANTHROPIC_API_KEY`
- `REDIS_URL`

**Migration Path**:
1. Deploy validation code with flag disabled
2. Verify all Railway secrets configured
3. Enable flag in staging → monitor 48 hours
4. Enable flag in production

### 1.3 API Key Timing-Safe Comparison

**File**: `src/middleware.ts`

**Problem**: Simple `===` comparison vulnerable to timing attacks

**Solution**: Use `crypto.timingSafeEqual()` for constant-time comparison

**Feature Flag**: `FEATURE_FLAG_SECURITY_TIMING_SAFE_AUTH`

**Implementation**:
```typescript
function hasValidApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("X-API-Key");
  if (!apiKey || !INTERNAL_API_KEY) return false;

  // Pad to same length to prevent length leak
  const keyBuffer = Buffer.from(apiKey.padEnd(64, '\0'));
  const expectedBuffer = Buffer.from(INTERNAL_API_KEY.padEnd(64, '\0'));

  const valid = crypto.timingSafeEqual(keyBuffer, expectedBuffer);
  
  if (!valid) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
  }
  return valid;
}
```

**Additional Security**:
- Rate limiting: 5 failures per IP per minute
- Random delay (0-100ms) on failed attempts
- Auto-block after 20 consecutive failures from same IP
- Log all failed attempts with IP address

### 1.4 Privilege Escalation Fix

**File**: `src/app/api/admin/users/[userId]/route.ts`

**Problem**: Logic bug counts array length instead of SQL count result
- `adminCount.length` returns row count (always 1), not the actual count value

**Solution**: Properly extract count value from aggregation result

**Feature Flag**: `FEATURE_FLAG_SECURITY_SAFE_ROLE_DEMOTION`

**Implementation**:
```typescript
const [adminResult] = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
  .where(eq(users.role, "ADMIN"));

const [devResult] = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
  .where(eq(users.role, "DEVELOPER"));

const totalPrivilegedUsers = (adminResult?.count || 0) + (devResult?.count || 0);

if (totalPrivilegedUsers <= 1) {
  throw new Error("Cannot demote the last admin/developer");
}
```

**Additional Safety**:
- Audit log for all role changes (who, when, from/to role)
- Require password confirmation for demoting admins
- Prevent self-demotion (cannot demote own account)

### Phase 1 Rollout Plan

**Week 2 Timeline**:
1. Deploy all fixes with flags **disabled**
2. Enable `ATOMIC_IDEMPOTENCY` → monitor 72h
3. Enable `STRICT_ENV_VALIDATION` → monitor 48h
4. Enable `TIMING_SAFE_AUTH` → monitor 48h
5. Enable `SAFE_ROLE_DEMOTION` → monitor 24h
6. If all green after 1 week, schedule flag removal (cleanup)

**Rollback Criteria**: Error rate >1%, latency >2x baseline, any unexpected behavior → instant flag toggle

---

## Phase 2: Performance Optimizations (Week 3-4)

### 2.1 Database Connection Pool Tuning

**File**: `src/db/index.ts`

**Problem**: `max: 20` exhausts all Railway Pro connections (no headroom)

**Solution**:
```typescript
const client = postgres(process.env.DATABASE_URL!, {
  max: 15,                     // Leave 5 for safety margin
  idle_timeout: 120,           // 2 minutes (reduce churn)
  max_lifetime: 60 * 30,       // 30 minutes
  connect_timeout: 10,
  keep_alive: 60,
  statement_timeout: 15000,    // 15s for API routes (fail fast)
});
```

**Feature Flag**: `FEATURE_FLAG_PERF_OPTIMIZED_POOL`

**Metrics**:
- `db.pool.active` - Active connections
- `db.pool.idle` - Idle connections
- `db.pool.waiting` - Requests waiting for connection
- `db.pool.exhaustion_events` - Times pool reached max

**Testing**: Load test with 50 concurrent requests (simulate peak traffic)

### 2.2 WhatsApp Send with Retry Logic

**File**: `src/lib/gowa.ts`

**Problem**: Single attempt, no timeout, no retry → messages lost on transient failures

**Solution**: Exponential backoff retry with circuit breaker

**Feature Flag**: `FEATURE_FLAG_PERF_WHATSAPP_RETRY`

**Implementation**:
```typescript
export const sendWhatsAppMessage = async (
  message: WhatsAppMessage,
  maxRetries = 3
): Promise<WhatsAppMessageResult> => {
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${GOWA_ENDPOINT}/send/message`, {
        method: "POST",
        headers: { Authorization: getBasicAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const result = await response.json();

      if (result.code === "SUCCESS" || response.ok) {
        return { success: true, messageId: result.results?.message_id };
      }

      // Don't retry on 4xx (client errors)
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: result.message };
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Max retries exceeded" };
};
```

**Circuit Breaker**: If GOWA failure rate >50% in 1 minute → open circuit for 30 seconds

**Metrics**:
- `whatsapp.send.success_first_attempt`
- `whatsapp.send.success_after_retry`
- `whatsapp.send.permanent_failure`
- `whatsapp.send.duration_ms`

### 2.3 Batch Operations - Cleanup Job

**File**: `src/app/api/cron/cleanup-conversations/route.ts`

**Problem**: N+1 queries (2000 queries for 1000 states)

**Solution**: Bulk delete and update
```typescript
const stateIds = expiredStates.map(s => s.id);

// Bulk delete messages
await db.delete(conversationMessages)
  .where(inArray(conversationMessages.conversationStateId, stateIds));

// Bulk update states
await db.update(conversationStates)
  .set({ deletedAt: new Date(), isActive: false })
  .where(inArray(conversationStates.id, stateIds));
```

**Feature Flag**: `FEATURE_FLAG_PERF_BATCH_CLEANUP`

**Safety**:
- Batch size limit: max 500 states per run
- Transaction with rollback on failure
- Log batch metrics: records affected, duration

**Expected Impact**: 2000 queries → 3 queries (select + delete + update)

### 2.4 Pagination Bounds Protection

**Files**: 
- `src/app/api/patients/route.ts`
- `src/app/api/admin/users/route.ts`

**Problem**: Unbounded `page` and `limit` parameters → potential DoS

**Solution**: Add validation and bounds
```typescript
const filters: PatientFilters = {
  page: Math.min(Math.max(parseInt(searchParams.get("page") || "1"), 1), 10000),
  limit: Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100),
};
```

**Feature Flag**: `FEATURE_FLAG_PERF_PAGINATION_BOUNDS`

**Defaults**:
- `page`: Default 1, min 1, max 10000
- `limit`: Default 50, min 1, max 100

**Response Enhancement**: Add pagination metadata
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "hasNext": true
  }
}
```

### 2.5 Graceful Shutdown Handler

**File**: `src/lib/shutdown.ts` (new)

**Problem**: No cleanup on Railway dyno restart → abrupt connection termination

**Solution**: Listen to SIGTERM/SIGINT and cleanup gracefully

**Feature Flag**: `FEATURE_FLAG_PERF_GRACEFUL_SHUTDOWN`

**Implementation**:
```typescript
import { redis } from './redis';
import { client } from '@/db';
import { logger } from './logger';

const shutdown = async () => {
  logger.info('Graceful shutdown initiated');
  
  // Stop accepting new requests
  // (HTTP server close handled by Next.js)
  
  // Wait for pending requests (30s grace period)
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Close connections
  await redis.quit();
  await client.end();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

**Railway Integration**: Railway sends SIGTERM 30 seconds before killing dyno

### Phase 2 Rollout Plan

**Week 3-4 Timeline**:
1. Enable `OPTIMIZED_POOL` → monitor 72h
2. Enable `WHATSAPP_RETRY` → monitor 72h
3. Enable `BATCH_CLEANUP` → monitor 48h
4. Enable `PAGINATION_BOUNDS` → monitor 48h
5. Enable `GRACEFUL_SHUTDOWN` → test via manual restart → monitor 48h

**Success Metrics**:
- Connection exhaustion events: <5 per day
- WhatsApp delivery success: >98%
- Cleanup job duration: <30 seconds
- API p95 latency: <500ms

---

## Phase 3: Database Optimizations (Week 5)

**CRITICAL**: All index creation MUST use `CONCURRENTLY` to avoid table locks

### 3.1 Composite Index - Conversation States

**File**: `src/db/reminder-schema.ts`

**Problem**: Queries filtering by `patientId + isActive + expiresAt` do sequential scans

**Solution**: Add composite index
```typescript
export const conversationStatesPatientActiveIdx = index(
  "conversation_states_patient_active_idx"
).on(
  conversationStates.patientId,
  conversationStates.isActive,
  conversationStates.expiresAt
);
```

**Migration Strategy**:
1. Generate migration: `bunx drizzle-kit generate`
2. **Manually edit SQL** to add `CONCURRENTLY`:
   ```sql
   CREATE INDEX CONCURRENTLY conversation_states_patient_active_idx 
   ON conversation_states (patient_id, is_active, expires_at);
   ```
3. Test on staging database clone
4. Apply to production (safe even during peak traffic)

**Expected Impact**: Active conversation lookup 200ms → <10ms

### 3.2 Composite Index - Conversation Messages

**File**: `src/db/reminder-schema.ts`

**Problem**: Loading messages for conversation does full table scan

**Solution**: Add composite index for filtering + sorting
```typescript
export const conversationMessagesStateCreatedIdx = index(
  "conversation_messages_state_created_idx"
).on(
  conversationMessages.conversationStateId,
  conversationMessages.createdAt
);
```

**Migration Strategy**: Same as 3.1 with `CONCURRENTLY`

**Expected Impact**: Message history retrieval 150ms → <5ms

### 3.3 Index Health Monitoring

**Post-Migration Validation**:
1. Verify creation: `SELECT * FROM pg_indexes WHERE tablename IN ('conversation_states', 'conversation_messages');`
2. Check usage: `SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE '%conversation%';`
3. Validate query plans: `EXPLAIN ANALYZE` on critical queries
4. Monitor bloat: `pg_stat_user_tables`

**Index Health Metrics**:
- `idx_scan` - Index scans (should increase)
- `idx_tup_read` - Tuples read from index
- `idx_tup_fetch` - Tuples fetched from table

### 3.4 Unbounded Query Fix

**File**: `src/services/conversation-state.service.ts`

**Problem**: Loads ALL conversation states for patient → memory exhaustion risk

**Solution**: Add limit and ordering
```typescript
const allStates = await db.select().from(conversationStates)
  .where(eq(conversationStates.patientId, patientId))
  .limit(1000)
  .orderBy(desc(conversationStates.createdAt));
```

**Additional Safety**: Log warning if result hits limit (indicates cleanup needed)

### 3.5 Cache Key Collision Fix

**File**: `src/lib/response-cache.ts`

**Problem**: Truncated base64 causes hash collisions

**Solution**: Use full SHA256 hash
```typescript
private generateCacheKey(intent: string, patientContext: Record<string, unknown>): string {
  const contextStr = JSON.stringify(patientContext);
  const hash = crypto.createHash('sha256').update(contextStr).digest('hex');
  return `llm:${intent}:${hash}`;
}
```

**Why**: Full 64-char hex = 256 bits entropy (collision negligible)

### 3.6 Schema Type Fix

**File**: `src/db/core-schema.ts`

**Problem**: `verificationAttempts` is `text()` instead of `integer()`

**Solution**:
```typescript
verificationAttempts: integer("verification_attempts").default(0).notNull(),
```

**Migration Strategy**:
1. Generate migration (will ALTER COLUMN)
2. Test conversion: `SELECT verification_attempts::integer FROM patients LIMIT 100;`
3. Apply during low traffic (brief table lock)

### Phase 3 Rollout Plan

**Week 5 Timeline**:
- Day 1-2: Generate migrations, review SQL carefully
- Day 3: Apply indexes CONCURRENTLY in staging, validate with EXPLAIN ANALYZE
- Day 4: Monitor staging 24 hours, check index usage
- Day 5: Apply indexes to production
- Day 6-7: Monitor query performance, validate improvements

**Success Criteria**:
- Index creation completes without errors
- `idx_scan > 0` (indexes being used)
- Query latency improvements visible
- No lock incidents

**Rollback**: `DROP INDEX CONCURRENTLY index_name;` if issues (unlikely)

---

## Phase 4: Low Priority & Testing (Week 6)

### 4.1 ESLint Cleanup

**File**: `next.config.ts`

**Issue**: `ignoreDuringBuilds: true` for ESLint

**Fix**:
1. Remove `ignoreDuringBuilds: true`
2. Run `bun run lint` to see all issues
3. Auto-fix: `bun run lint --fix`
4. Manual fixes: unused vars, missing deps, `any` types
5. Suppressions: legitimate cases with inline comments

**Priority**: Low but important for maintainability

### 4.2 File Upload Path Traversal Protection

**File**: `src/app/api/upload/route.ts`

**Solution**: Sanitize filenames
```typescript
const sanitizedFilename = path.basename(filename)
  .replace(/[^a-zA-Z0-9.-]/g, "_")
  .replace(/\.+/g, ".")
  .substring(0, 255);
```

**Additional**:
- Validate extensions against allowlist
- Check MIME type matches extension
- Add random prefixes to prevent collisions

**Testing**: Upload files with malicious names

### 4.3 CSRF Protection

**File**: `src/app/api/admin/users/[userId]/route.ts`

**Approach**: Origin header validation (simplest for API-only)
```typescript
const origin = req.headers.get('origin');
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];
if (origin && !allowedOrigins.includes(origin)) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
}
```

**Alternative**: CSRF tokens (more robust but requires state management)

### 4.4 Debug Endpoints

**Files**:
- `src/app/api/auth/debug/route.ts`
- `src/app/api/debug/webhook/route.ts`
- `src/app/api/test/reminder-flow/route.ts`

**Solution**: Production guard + API key requirement
```typescript
if (process.env.NODE_ENV === 'production') {
  // Require API key for debug endpoints
  if (!hasValidApiKey(req)) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
}
```

### 4.5 Cache Invalidation

**File**: `src/lib/cache-invalidator.ts` (new)

**Implementation**: Event-based invalidation
```typescript
export async function invalidatePatientCache(patientId: string) {
  const keys = await redis.keys(`llm:*:*${patientId}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Trigger Points**:
- After patient update: invalidate patient caches
- After reminder send: invalidate reminder caches
- After conversation change: invalidate conversation caches

**Performance**: Use Redis pipelining for bulk deletions

### 4.6 Health Check Performance

**File**: `src/app/api/health/route.ts`

**Issue**: CPU metrics calculated on every request

**Solution**: Cache for 5 seconds
```typescript
let cachedMetrics = { timestamp: 0, data: null };

export async function GET() {
  const now = Date.now();
  if (now - cachedMetrics.timestamp > 5000) {
    cachedMetrics = {
      timestamp: now,
      data: await calculateCPUMetrics()
    };
  }
  return NextResponse.json(cachedMetrics.data);
}
```

### 4.7 Comprehensive Testing

**Unit Testing** (Vitest - `bun test`):
- Phase 1: Atomic idempotency, timing-safe comparison, role demotion
- Phase 2: Retry logic, batch operations, pagination
- Phase 3: Query builders (Drizzle mocks)
- Coverage target: >80% for critical services

**Integration Testing**:
- Database migrations on staging clone
- Redis operations (idempotency, cache, rate limiting)
- WhatsApp integration with GOWA test endpoint
- API routes (auth, validation, error handling)

**Load Testing** (Artillery or k6):
- Baseline before optimizations
- Post-optimization validation
- Scenarios:
  - 50 concurrent API requests (normal)
  - 200 concurrent webhooks (spike)
  - 1000 reminders scheduled

**Production Testing**:
- Canary rollout: 5% → 25% → 50% → 100%
- Monitor at each stage
- Automated rollback on degradation

**Existing Suite**: Run `bun run test:comprehensive` (~8 min)

### Phase 4 Rollout Plan

**Week 6 Timeline**:
- Day 1: ESLint cleanup
- Day 2: Security hardening (upload, CSRF, debug)
- Day 3: Cache invalidation
- Day 4: Health check optimization
- Day 5-7: Comprehensive testing

**Success Criteria**:
- Zero ESLint errors
- All security tests pass
- Load tests show improvements
- Comprehensive suite passes

---

## Rollback Strategy

### Multi-Level Rollback

**Level 1: Feature Flag Toggle (Instant - 0s)**
- Railway Dashboard: Set `FEATURE_FLAG_*=false`
- No deployment needed
- Old implementation activates immediately
- Use for: Error spikes, latency spikes

**Level 2: Git Revert + Redeploy (Fast - 2-3min)**
- `git revert <commit>` + `git push`
- Railway auto-deploys
- Use for: Bug in flag logic itself

**Level 3: Database Rollback (Medium - 5-10min)**
- Drizzle DOWN migration
- Or `DROP INDEX CONCURRENTLY`
- Use for: Schema changes causing issues

**Level 4: Full Environment Rollback (Slow - 15-30min)**
- Railway snapshot restore
- Database backup restore
- Use for: Catastrophic failure

### Automated Rollback Triggers

**Metrics-Based** (optional, implement in Phase 2/3):
- Error rate >1% → auto-rollback
- p95 latency >2x baseline → auto-rollback
- Check every 60 seconds

**Manual Override**: `/api/admin/emergency-rollback` endpoint (requires API key + admin)

### Incident Response Playbook

**Scenario 1: Error Rate Spike**
1. Check `/api/admin/migration-health` - which flag active?
2. Review logs for error patterns
3. Disable suspect flag immediately
4. Monitor 5 minutes
5. If not resolved, git revert
6. Post-mortem analysis

**Scenario 2: Latency Degradation**
1. Check if specific endpoint or global
2. Review connection pool metrics
3. Check for index lock contention
4. Disable performance flags one by one
5. Scale Railway instance temporarily

**Scenario 3: Connection Exhaustion**
1. Check connection pool status
2. Identify which service holding connections
3. Quick fix: Disable `OPTIMIZED_POOL` flag
4. Long-term: Fix connection leak
5. Consider temporary DB upgrade

**Scenario 4: WhatsApp Messages Not Sending**
1. Check GOWA service health
2. Review retry metrics
3. Wait for circuit breaker reset (30s)
4. Disable `WHATSAPP_RETRY` flag if needed
5. Check API key/configuration

---

## Monitoring Dashboard

### Migration Health Dashboard

**Route**: `src/app/api/admin/migration-health/route.ts`

**Section A: Feature Flag Status**
- All flags with enabled state
- Activation timestamp
- Rollout percentage

**Section B: Comparative Metrics**
- Old vs new implementation side-by-side
- Idempotency: duplicates, latency
- WhatsApp: success rate, retry recovery
- Database: query times, connection pool

**Section C: Database Health**
- Connection pool: active, idle, waiting
- Index usage: scans, tuples, last used
- Query performance: slow queries

**Section D: Recent Alerts**
- Timestamp, level, message, resolved status

### Monitoring Checklist

**Daily (First 2 Weeks)**:
- [ ] Check migration health dashboard
- [ ] Review Railway logs for ALERT level
- [ ] Verify no error rate spikes
- [ ] Compare p95 latency vs baseline
- [ ] Check connection pool usage
- [ ] Verify index usage stats

**Weekly (Week 3-6)**:
- [ ] Trend analysis: improvements sustained?
- [ ] Memory leak check (Railway graphs)
- [ ] User-reported issues review
- [ ] Cleanup jobs completing successfully
- [ ] Slow query logs (>5s queries)

**Post-Migration Audit (After Week 6)**:
- [ ] Document actual vs expected improvements
- [ ] Remove stable feature flags (2+ weeks)
- [ ] Archive old code (git tag before delete)
- [ ] Update CLAUDE.md with new patterns
- [ ] Share learnings

### Success Metrics

**Baseline (Week 1) → Target (Week 6)**

| Metric | Baseline | Target | Check |
|--------|----------|--------|-------|
| Error Rate | TBD | <0.5% | Daily |
| API p95 Latency | TBD | <500ms | Daily |
| WhatsApp Success | TBD | >98% | Daily |
| Connection Exhaustion | TBD | <5/day | Daily |
| Duplicate Messages | TBD | 0 | Weekly |
| Cleanup Duration | TBD | <5s | Weekly |
| Index Usage | N/A | >1000/day | Weekly |

---

## Communication Plan

**Internal Team**:
- Before phase: "Deploying Phase X tomorrow, no downtime expected"
- After flag enabled: "Phase X enabled, monitoring 72h"
- If issues: "Issue detected, rolled back via flag"
- Weekly summary: "Phase 1 ✓, Phase 2 ✓, Phase 3 in progress"

**User Communication**:
- Generally: No communication needed (zero-downtime)
- If maintenance: "Brief window 2-5AM for DB optimization"
- If incident: "Investigating [issue], service operating via rollback"

---

## Implementation Notes

**Key Principles**:
1. **Safety First**: Feature flags + monitoring before optimization
2. **Gradual Rollout**: Enable one flag at a time with monitoring
3. **Baseline Everything**: Week 1 baseline critical for comparison
4. **Test Thoroughly**: Unit + integration + load testing
5. **Document Changes**: Update CLAUDE.md with new patterns

**Railway-Specific**:
- Memory: Consider `--max-old-space-size=512` if needed
- Connections: Reduced to 15 to leave headroom
- Scaling: Consider job queue (Bull/BullMQ) for AI processing
- Monitoring: Structured logs → Railway aggregation
- Secrets: Use Railway's secret management

**Critical Success Factors**:
- Week 1 baseline establishment (cannot skip)
- CONCURRENTLY for all index creation
- Feature flag discipline (no direct edits)
- Monitoring before optimization
- 72-hour minimum monitoring per phase

---

## Next Steps

1. **Load writing-plans skill** - Create detailed implementation tasks
2. **Offer execution choice** - Subagent-driven vs parallel session
3. **TDD for all code** - Write tests first, see red, then green
4. **Code review between tasks** - Quality gates throughout
5. **Verification before completion** - Run all tests, validate metrics

**This design is approved and ready for implementation planning.**
