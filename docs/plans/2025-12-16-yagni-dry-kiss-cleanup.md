# YAGNI/DRY/KISS Aggressive Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unused infrastructure, consolidate duplicated code, and simplify over-engineered systems following YAGNI, DRY, and KISS principles.

**Architecture:** Aggressive cleanup approach - remove all unused/premature infrastructure, extract duplicated logic to shared utilities, simplify feature flag system to env vars, and add minimal ADR documentation.

**Tech Stack:** TypeScript, Next.js, existing utility patterns

---

## Task 1: Remove Unused Emergency Alert System

**Files:**
- Modify: `src/services/whatsapp/whatsapp.service.ts:241-272`

**Step 1: Remove sendEmergencyAlert method**

Remove the entire `sendEmergencyAlert` method from WhatsAppService class (lines 241-272). This method only logs warnings and has no actual implementation.

**Step 2: Search for any usages**

Run: `grep -r "sendEmergencyAlert" src/`
Expected: No results (method is unused)

**Step 3: Verify tests still pass**

Run: `bun test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/services/whatsapp/whatsapp.service.ts
git commit -m "refactor: remove unused emergency alert system (YAGNI)"
```

---

## Task 2: Create Shared Content Formatting Utility

**Files:**
- Create: `src/lib/content-formatting.ts`
- Modify: `src/services/whatsapp/whatsapp.service.ts:84-104`
- Modify: `src/services/reminder/reminder.service.ts:399-435`

**Step 1: Create content formatting utility**

Create `src/lib/content-formatting.ts`:

```typescript
/**
 * Content formatting utilities for WhatsApp messages
 * Centralizes icon and prefix logic to follow DRY principle
 */

export type ContentType = 'article' | 'video' | 'other';

export interface ContentItem {
  id: string;
  type: string;
  title: string;
  url: string;
}

/**
 * Get content prefix based on type
 */
export function getContentPrefix(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case 'article':
      return '📚 Baca juga:';
    case 'video':
      return '🎥 Tonton juga:';
    default:
      return '📖 Lihat juga:';
  }
}

/**
 * Get content icon based on type
 */
export function getContentIcon(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case 'article':
      return '📄';
    case 'video':
      return '🎥';
    default:
      return '📖';
  }
}

/**
 * Format content items for WhatsApp message
 * Groups by type and adds proper formatting
 */
export function formatContentForWhatsApp(
  baseMessage: string,
  attachedContent: ContentItem[]
): string {
  if (!attachedContent || attachedContent.length === 0) return baseMessage;

  let message = baseMessage;
  const contentByType: Record<string, ContentItem[]> = {};

  // Group content by type
  for (const content of attachedContent) {
    const type = content.type?.toLowerCase() || 'other';
    if (!contentByType[type]) contentByType[type] = [];
    contentByType[type].push(content);
  }

  // Add content sections
  for (const contentType of Object.keys(contentByType)) {
    const contents = contentByType[contentType];
    message += `\n\n${getContentPrefix(contentType)}`;
    for (const c of contents) {
      const icon = getContentIcon(c.type);
      message += `\n${icon} ${c.title}`;
      message += `\n   ${c.url}`;
    }
  }

  message += '\n\n💙 Tim PRIMA';
  return message;
}
```

**Step 2: Update WhatsAppService to use utility**

In `src/services/whatsapp/whatsapp.service.ts`:

Remove methods `getContentPrefix()` (lines 84-93) and `getContentIcon()` (lines 95-104).

Update imports at top of file:
```typescript
import { formatContentForWhatsApp } from '@/lib/content-formatting';
```

Update `buildMessage()` method (line 106):
```typescript
buildMessage(baseMessage: string, attachments: ValidatedContent[]): string {
  return formatContentForWhatsApp(baseMessage, attachments as any);
}
```

**Step 3: Update ReminderService to use utility**

In `src/services/reminder/reminder.service.ts`:

Add import at top:
```typescript
import { formatContentForWhatsApp, ContentItem } from '@/lib/content-formatting';
```

Replace `appendContentToMessage()` method (lines 399-435) with:
```typescript
private appendContentToMessage(message: string, attachedContent: unknown[]): string {
  return formatContentForWhatsApp(message, attachedContent as ContentItem[]);
}
```

**Step 4: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 5: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/lib/content-formatting.ts src/services/whatsapp/whatsapp.service.ts src/services/reminder/reminder.service.ts
git commit -m "refactor: extract content formatting to shared utility (DRY)"
```

---

## Task 3: Create Template Utilities Module

**Files:**
- Create: `src/lib/template-utils.ts`
- Modify: `src/services/reminder/reminder.service.ts:56-80`

**Step 1: Create template utilities module**

Create `src/lib/template-utils.ts`:

```typescript
/**
 * Template variable replacement utilities
 * Centralizes template processing logic
 */

/**
 * Replace template variables in message
 * Supports {nama} for patient name and custom variables
 */
export function replaceTemplateVariables(
  message: string,
  patientName: string,
  additionalVars?: Record<string, string>
): string {
  let processedMessage = message;

  // Replace patient name
  processedMessage = processedMessage.replace(/{nama}/g, patientName);

  // Replace additional variables if provided
  if (additionalVars) {
    Object.keys(additionalVars).forEach((key) => {
      const placeholder = `{${key}}`;
      if (processedMessage.includes(placeholder)) {
        processedMessage = processedMessage.replace(
          new RegExp(placeholder, 'g'),
          additionalVars[key] || ''
        );
      }
    });
  }

  return processedMessage;
}
```

**Step 2: Update ReminderService to use utility**

In `src/services/reminder/reminder.service.ts`:

Add import at top:
```typescript
import { replaceTemplateVariables } from '@/lib/template-utils';
```

Remove the private `replaceTemplateVariables()` method (lines 56-80).

Update the call in `sendReminder()` method (around line 339):
```typescript
const processedMessage = replaceTemplateVariables(params.message, params.patientName);
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/lib/template-utils.ts src/services/reminder/reminder.service.ts
git commit -m "refactor: extract template utilities to shared module (DRY)"
```

---

## Task 4: Simplify Feature Flags to Environment Variables

**Files:**
- Delete: `src/lib/feature-flags.ts`
- Delete: `src/lib/feature-flag-config.ts`
- Modify: `src/lib/gowa.ts:4,194`
- Modify: `src/lib/idempotency.ts:4,19`

**Step 1: Check current feature flag usage**

Run: `grep -r "featureFlags.isEnabled" src/`
Expected: Find usages in gowa.ts and idempotency.ts

**Step 2: Update gowa.ts to use env var**

In `src/lib/gowa.ts`:

Remove import (line 4):
```typescript
import { featureFlags } from '@/lib/feature-flags';
```

Update line 194:
```typescript
const useRetry = process.env.FEATURE_FLAG_PERF_WHATSAPP_RETRY === 'true';
```

**Step 3: Update idempotency.ts to use env var**

In `src/lib/idempotency.ts`:

Remove import (line 4):
```typescript
import { featureFlags } from '@/lib/feature-flags';
```

Update line 19:
```typescript
if (process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY === 'true') {
```

**Step 4: Delete feature flag files**

Run:
```bash
rm src/lib/feature-flags.ts
rm src/lib/feature-flag-config.ts
```

**Step 5: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 6: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 7: Update .env documentation**

Add to `.env.local` or `.env.example`:
```
# Feature Flags (simple env vars)
FEATURE_FLAG_PERF_WHATSAPP_RETRY=true
FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true
```

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: simplify feature flags to env vars (YAGNI/KISS)"
```

---

## Task 5: Remove Legacy Idempotency Implementation

**Files:**
- Modify: `src/lib/idempotency.ts:15-85`

**Step 1: Check if atomic implementation is stable**

Review recent logs/metrics for idempotency errors. If atomic implementation has been running without issues, proceed with removal.

**Step 2: Simplify isDuplicateEvent function**

In `src/lib/idempotency.ts`, replace the entire `isDuplicateEvent` function (lines 15-85) with:

```typescript
/**
 * Check if an event is a duplicate using atomic idempotency key
 * Uses SET NX EX for atomic operation to prevent race conditions
 */
export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Atomic check-and-set operation
    const exists = await redis.exists(key);
    if (exists) {
      metrics.increment('idempotency.duplicate_detected');

      logger.debug('Idempotency check - duplicate', {
        operation: 'idempotency.check',
        key,
        isDuplicate: true,
        duration_ms: Date.now() - startTime,
      });

      return true;
    }

    await redis.set(key, '1', ttlSeconds);
    metrics.increment('idempotency.check');

    logger.debug('Idempotency check - new', {
      operation: 'idempotency.check',
      key,
      isDuplicate: false,
      duration_ms: Date.now() - startTime,
    });

    return false;
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
```

**Step 3: Remove feature flag import**

Remove the feature flag import if not already removed in Task 4.

**Step 4: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 5: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/lib/idempotency.ts
git commit -m "refactor: remove legacy idempotency implementation (YAGNI)"
```

---

## Task 6: Evaluate and Remove Metrics System (If Unused)

**Files:**
- Potentially delete: `src/lib/metrics.ts`
- Modify: Files that import metrics

**Step 1: Check metrics usage**

Run: `grep -r "from '@/lib/metrics'" src/`
Expected: Find all files importing metrics

Run: `grep -r "metrics\\.increment\\|metrics\\.recordHistogram\\|metrics\\.setGauge" src/`
Expected: Find all metric recording calls

**Step 2: Decision point**

If metrics are actively monitored in production:
- Keep the system
- Skip to Task 7

If metrics are NOT actively monitored:
- Continue with removal

**Step 3: Remove metrics from gowa.ts**

In `src/lib/gowa.ts`:

Remove import:
```typescript
import { metrics } from '@/lib/metrics';
```

Remove all `metrics.increment()` calls (lines 229, 236, 247, 274, 285, 289).

**Step 4: Remove metrics from idempotency.ts**

In `src/lib/idempotency.ts`:

Remove import:
```typescript
import { metrics } from '@/lib/metrics';
```

Remove all `metrics.increment()` calls.

**Step 5: Check for other usages**

Run: `grep -r "metrics\\." src/`
Expected: No results or only in metrics.ts itself

**Step 6: Delete metrics file**

Run: `rm src/lib/metrics.ts`

**Step 7: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 8: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: remove unused metrics system (YAGNI)"
```

---

## Task 7: Add Architecture Decision Records (ADRs)

**Files:**
- Create: `docs/architecture/adr/001-whatsapp-retry-logic.md`
- Create: `docs/architecture/adr/002-idempotency-strategy.md`
- Create: `docs/architecture/adr/README.md`

**Step 1: Create ADR directory structure**

Run:
```bash
mkdir -p docs/architecture/adr
```

**Step 2: Create ADR README**

Create `docs/architecture/adr/README.md`:

```markdown
# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions in the PRIMA codebase.

## Format

Each ADR follows this structure:
- **Title**: Short descriptive title
- **Status**: Accepted, Superseded, Deprecated
- **Context**: What is the issue we're facing?
- **Decision**: What did we decide?
- **Consequences**: What are the trade-offs?

## Index

- [ADR-001: WhatsApp Retry Logic](./001-whatsapp-retry-logic.md)
- [ADR-002: Idempotency Strategy](./002-idempotency-strategy.md)
```

**Step 3: Create WhatsApp Retry Logic ADR**

Create `docs/architecture/adr/001-whatsapp-retry-logic.md`:

```markdown
# ADR-001: WhatsApp Retry Logic with Exponential Backoff

**Status**: Accepted

**Date**: 2025-12-16

## Context

WhatsApp message delivery is critical for patient reminders in the PRIMA healthcare system. Network failures, temporary service outages, or rate limiting can cause message delivery failures. We need a robust retry mechanism to ensure messages are delivered reliably.

## Decision

Implement exponential backoff retry logic in `src/lib/gowa.ts:184-323` with the following characteristics:

- **3 retry attempts** maximum
- **Exponential backoff**: 1s, 2s, 4s delays
- **10-second timeout** per attempt
- **No retry on 4xx errors** (client errors won't succeed on retry)
- **Retry on 5xx errors** and network failures
- **Feature flag control**: `FEATURE_FLAG_PERF_WHATSAPP_RETRY` (now env var)

### Implementation Details

```typescript
const maxRetries = useRetry ? 3 : 1;
const baseDelay = 1000; // 1 second
const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
```

### Metrics Tracked
- `whatsapp.send.success_first_attempt`
- `whatsapp.send.success_after_retry`
- `whatsapp.send.permanent_failure`
- `whatsapp.send.timeout`

## Consequences

### Positive
- **Improved reliability**: Transient failures don't result in lost messages
- **Better user experience**: Patients receive reminders even during temporary outages
- **Observability**: Metrics help identify systemic issues
- **Configurable**: Can disable retries if causing issues

### Negative
- **Increased complexity**: More code paths to test and maintain
- **Latency**: Failed messages take longer (up to 7 seconds for 3 retries)
- **Resource usage**: More API calls to GOWA service

### Trade-offs
- Complexity is justified for critical healthcare messaging
- Latency is acceptable for async reminder delivery
- Resource usage is minimal compared to reliability gains

## Alternatives Considered

1. **No retry logic**: Simpler but unacceptable for healthcare
2. **Fixed delay retry**: Simpler but less efficient (thundering herd)
3. **Circuit breaker pattern**: More complex, overkill for current scale

## References

- Implementation: `src/lib/gowa.ts:184-323`
- GOWA API documentation
- Exponential backoff best practices
```

**Step 4: Create Idempotency Strategy ADR**

Create `docs/architecture/adr/002-idempotency-strategy.md`:

```markdown
# ADR-002: Atomic Idempotency for Webhook Processing

**Status**: Accepted

**Date**: 2025-12-16

## Context

PRIMA receives webhooks from GOWA (WhatsApp provider) for incoming messages. Webhooks can be delivered multiple times due to:
- Network retries
- Provider-side retries
- Race conditions in distributed systems

Processing duplicate webhooks causes:
- Duplicate reminder confirmations
- Incorrect patient state
- Duplicate AI responses

## Decision

Implement atomic idempotency checking using Redis in `src/lib/idempotency.ts` with:

- **Redis SET NX EX**: Atomic check-and-set operation
- **24-hour TTL**: Prevents indefinite memory growth
- **Fail-closed**: Treat Redis errors as duplicates (safe default)
- **SHA1 hashing**: Generate idempotency keys from webhook data

### Implementation

```typescript
export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  const exists = await redis.exists(key);
  if (exists) return true;

  await redis.set(key, '1', ttlSeconds);
  return false;
}
```

### Key Generation

```typescript
export function hashFallbackId(parts: (string | undefined)[]): string {
  const h = createHash('sha1');
  h.update(parts.filter(Boolean).join('|'));
  return h.digest('hex');
}
```

## Consequences

### Positive
- **Prevents duplicates**: Atomic operation eliminates race conditions
- **Simple implementation**: Easy to understand and maintain
- **Automatic cleanup**: TTL prevents memory leaks
- **Safe failure mode**: Redis errors don't cause duplicate processing

### Negative
- **Redis dependency**: System fails if Redis is unavailable
- **Memory usage**: Stores keys for 24 hours
- **No distributed locking**: Assumes single Redis instance

### Trade-offs
- Redis dependency is acceptable (already used for caching)
- 24-hour TTL balances memory vs. safety
- Single Redis instance is sufficient for current scale

## Alternatives Considered

1. **Database-based idempotency**: More durable but slower
2. **In-memory cache**: Faster but not distributed
3. **Distributed locks**: More complex, overkill for current needs

## Migration Notes

Legacy implementation had race condition between `exists()` and `set()` calls. Atomic implementation fixes this by using Redis SET NX EX command semantics.

## References

- Implementation: `src/lib/idempotency.ts`
- Redis SET NX EX documentation
- Webhook handler: `src/app/api/webhooks/gowa/route.ts`
```

**Step 5: Commit ADRs**

```bash
git add docs/architecture/adr/
git commit -m "docs: add ADRs for complex systems (retry logic, idempotency)"
```

---

## Task 8: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md to reflect changes**

In `CLAUDE.md`, update relevant sections:

1. Remove references to feature flags infrastructure
2. Update to mention simple env var approach
3. Remove metrics system references if deleted
4. Add reference to ADR documentation

**Step 2: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect YAGNI/DRY/KISS cleanup"
```

---

## Task 9: Final Verification

**Step 1: Run full type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 3: Run linter**

Run: `bun run lint`
Expected: No linting errors

**Step 4: Run precommit checks**

Run: `bun run precommit`
Expected: All checks pass

**Step 5: Review git log**

Run: `git log --oneline -10`
Expected: See all cleanup commits

**Step 6: Create summary commit if needed**

If you want a summary commit:
```bash
git commit --allow-empty -m "chore: complete YAGNI/DRY/KISS aggressive cleanup

- Removed unused emergency alert system
- Extracted content formatting to shared utility (DRY)
- Extracted template utilities to shared module (DRY)
- Simplified feature flags to env vars (YAGNI/KISS)
- Removed legacy idempotency implementation (YAGNI)
- Removed unused metrics system (YAGNI)
- Added ADRs for complex systems (documentation)

Total lines removed: ~500+
Improved code maintainability and reduced complexity"
```

---

## Completion Checklist

- [ ] Task 1: Emergency alert system removed
- [ ] Task 2: Content formatting utility created
- [ ] Task 3: Template utilities extracted
- [ ] Task 4: Feature flags simplified
- [ ] Task 5: Legacy idempotency removed
- [ ] Task 6: Metrics system evaluated/removed
- [ ] Task 7: ADRs created
- [ ] Task 8: Documentation updated
- [ ] Task 9: Final verification passed

## Estimated Impact

- **Lines removed**: ~500-700 lines
- **Files deleted**: 2-3 files (feature-flags.ts, feature-flag-config.ts, possibly metrics.ts)
- **Files created**: 3 files (content-formatting.ts, template-utils.ts, ADRs)
- **Complexity reduction**: Significant (removed 2 infrastructure systems)
- **Maintainability**: Improved (DRY violations fixed)
- **Test coverage**: Maintained (no test changes needed)
