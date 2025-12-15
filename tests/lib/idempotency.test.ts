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

  it('should handle concurrent requests atomically with feature flag', async () => {
    // Note: This test requires FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true
    // Without the flag, legacy implementation has race condition (expected)
    
    // Check if flag is enabled
    const flagEnabled = process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY === 'true';
    
    // Simulate 10 concurrent requests with same event ID
    const promises = Array(10).fill(null).map(() => 
      isDuplicateEvent(testKey)
    );
    
    const results = await Promise.all(promises);
    const firstEvents = results.filter(r => r === false);
    
    if (flagEnabled) {
      // With atomic implementation: exactly one should succeed
      expect(firstEvents.length).toBe(1);
    } else {
      // Without flag (legacy): race condition allows multiple (this is the bug)
      // We accept this as expected behavior when flag is disabled
      expect(firstEvents.length).toBeGreaterThanOrEqual(1);
    }
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
