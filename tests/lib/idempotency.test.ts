// tests/lib/idempotency.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDuplicateEvent } from '@/lib/idempotency';
import { redis } from '@/lib/redis';

describe('isDuplicateEvent', () => {
  const testKey = 'test:event:123';

  const store = new Map<string, number>();

  beforeEach(() => {
    store.clear();

    vi.spyOn(redis, 'setnx').mockImplementation(
      async (key: string, _value: string, ttl?: number) => {
        const now = Date.now();
        const currentExpiry = store.get(key);

        if (currentExpiry && currentExpiry > now) {
          return false;
        }

        const expiresAt = now + (ttl ? ttl * 1000 : 24 * 60 * 60 * 1000);
        store.set(key, expiresAt);
        return true;
      }
    );

    vi.spyOn(redis, 'del').mockImplementation(async (key: string) => {
      store.delete(key);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    store.clear();
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
    // Atomic implementation should allow exactly one request to succeed
    // even when multiple requests are made concurrently

    // Simulate 10 concurrent requests with same event ID
    const promises = Array(10).fill(null).map(() =>
      isDuplicateEvent(testKey)
    );

    const results = await Promise.all(promises);
    const firstEvents = results.filter(r => r === false);

    // With atomic implementation: exactly one should succeed
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
    vi.spyOn(redis, 'setnx').mockRejectedValue(new Error('Redis down'));

    const isDuplicate = await isDuplicateEvent(testKey);
    expect(isDuplicate).toBe(true); // Fail closed
  });
});
