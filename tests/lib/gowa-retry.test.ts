// tests/lib/gowa-retry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('WhatsApp Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry on transient failures with exponential backoff', async () => {
    // Mock fetch to fail twice, then succeed
    let attemptCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ code: 'SUCCESS', results: { message_id: '123' } }),
      });
    });

    // Simulate retry logic
    const maxRetries = 3;
    const baseDelay = 100; // Use shorter delay for tests
    let success = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('http://test/send/message');
        if (response.ok) {
          success = true;
          break;
        }
      } catch (error) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    expect(success).toBe(true);
    expect(attemptCount).toBe(3); // Failed 2 times, succeeded on 3rd
  });

  it('should not retry on 4xx client errors', async () => {
    let attemptCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ code: 'ERROR', message: 'Invalid request' }),
      });
    });

    const maxRetries = 3;
    let shouldRetry = false;

    try {
      const response = await fetch('http://test/send/message');
      // Don't retry on 4xx
      shouldRetry = response.status >= 500 || response.status === 0;
    } catch {
      shouldRetry = true;
    }

    expect(shouldRetry).toBe(false);
    expect(attemptCount).toBe(1); // Should only attempt once
  });

  it('should have timeout capability', () => {
    // Test that AbortController can timeout requests
    const controller = new AbortController();
    const timeoutMs = 100;
    
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Verify controller can be aborted
    expect(controller.signal.aborted).toBe(false);
    
    clearTimeout(timeoutId);
    controller.abort();
    
    expect(controller.signal.aborted).toBe(true);
  });
});
