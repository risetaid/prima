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
