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
