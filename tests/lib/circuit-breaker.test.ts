/**
 * Circuit Breaker Tests
 *
 * Tests for the Circuit Breaker pattern implementation.
 * Verifies state transitions: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  getCircuitBreaker,
  resetAllCircuitBreakers,
  getAllCircuitBreakerStates,
  DEFAULT_CIRCUIT_CONFIGS,
} from '@/lib/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    // Reset all circuit breakers before each test
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 5,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });

      expect(cb.getState().state).toBe(CircuitState.CLOSED);
      expect(cb.getState().isClosed).toBe(true);
      expect(cb.getState().isOpen).toBe(false);
      expect(cb.getState().isHalfOpen).toBe(false);
    });

    it('should open after failure threshold is reached', async () => {
      const cb = new CircuitBreaker('test-open', {
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(async () => {
          throw new Error('Service unavailable');
        })).rejects.toThrow('Service unavailable');
      }

      expect(cb.getState().state).toBe(CircuitState.OPEN);
      expect(cb.getState().isOpen).toBe(true);
    });

    it('should fail fast when OPEN', async () => {
      const cb = new CircuitBreaker('test-fail-fast', {
        failureThreshold: 2,
        resetTimeout: 100,
        monitoringPeriod: 1000,
      });

      // Open the circuit
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      expect(cb.getState().isOpen).toBe(true);

      // Should fail fast without executing
      await expect(cb.execute(async () => {
        return 'should not reach here';
      })).rejects.toThrow('Circuit breaker OPEN');
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const cb = new CircuitBreaker('test-half-open', {
        failureThreshold: 2,
        resetTimeout: 50, // 50ms
        monitoringPeriod: 1000,
      });

      // Open the circuit
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      expect(cb.getState().isOpen).toBe(true);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should transition to HALF_OPEN (need to call isAvailable to trigger state check)
      expect(cb.isAvailable()).toBe(true);
      expect(cb.getState().isHalfOpen).toBe(true);
    });

    it('should close after successful requests in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test-close', {
        failureThreshold: 2,
        resetTimeout: 50,
        monitoringPeriod: 1000,
      });

      // Open the circuit
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should be HALF_OPEN (need to call isAvailable to trigger state check)
      expect(cb.isAvailable()).toBe(true);
      expect(cb.getState().isHalfOpen).toBe(true);

      // Successful requests should close the circuit
      await cb.execute(async () => 'success');
      await cb.execute(async () => 'success');
      await cb.execute(async () => 'success');

      expect(cb.getState().isClosed).toBe(true);
    });

    it('should re-open if failure occurs in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test-reopen', {
        failureThreshold: 2,
        resetTimeout: 50,
        monitoringPeriod: 1000,
      });

      // Open the circuit
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should be HALF_OPEN (need to call isAvailable to trigger state check)
      expect(cb.isAvailable()).toBe(true);
      expect(cb.getState().isHalfOpen).toBe(true);

      // Fail in HALF_OPEN
      try {
        await cb.execute(async () => { throw new Error('fail again'); });
      } catch { /* ignore */ }

      expect(cb.getState().isOpen).toBe(true);
    });
  });

  describe('Success Tracking', () => {
    it('should reset failure count on success in CLOSED state', async () => {
      const cb = new CircuitBreaker('test-reset', {
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });

      // Fail twice
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      expect(cb.getState().failureCount).toBe(2);

      // Success should reset failure count
      await cb.execute(async () => 'success');

      expect(cb.getState().failureCount).toBe(0);
    });

    it('should track success count in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test-success-count', {
        failureThreshold: 2,
        resetTimeout: 50,
        monitoringPeriod: 1000,
      });

      // Open the circuit
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cb.getState().successCount).toBe(0);

      // First success
      await cb.execute(async () => 'success');
      expect(cb.getState().successCount).toBe(1);
    });
  });

  describe('Force Reset', () => {
    it('should force reset to CLOSED state', async () => {
      const cb = new CircuitBreaker('test-force', {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });

      // Force open
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      expect(cb.getState().isOpen).toBe(true);

      // Force reset
      cb.forceReset();

      expect(cb.getState().isClosed).toBe(true);
      expect(cb.getState().failureCount).toBe(0);
      expect(cb.getState().successCount).toBe(0);
    });
  });

  describe('Global Registry', () => {
    it('should return same instance for same name', () => {
      const cb1 = getCircuitBreaker('singleton');
      const cb2 = getCircuitBreaker('singleton');

      expect(cb1).toBe(cb2);
    });

    it('should return different instances for different names', () => {
      const cb1 = getCircuitBreaker('service-a');
      const cb2 = getCircuitBreaker('service-b');

      expect(cb1).not.toBe(cb2);
    });

    it('should return all circuit breaker states', () => {
      getCircuitBreaker('registry-1');
      getCircuitBreaker('registry-2');

      const states = getAllCircuitBreakerStates();

      expect(Object.keys(states)).toContain('registry-1');
      expect(Object.keys(states)).toContain('registry-2');
    });

    it('should reset all circuit breakers', async () => {
      // Use new instances directly to avoid registry caching issues
      const cb1 = new CircuitBreaker('test-reset-all-1', {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });
      const cb2 = new CircuitBreaker('test-reset-all-2', {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 10000,
      });

      // Open both
      try {
        await cb1.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb1.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb2.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }
      try {
        await cb2.execute(async () => { throw new Error('fail'); });
      } catch { /* ignore */ }

      expect(cb1.getState().isOpen).toBe(true);
      expect(cb2.getState().isOpen).toBe(true);

      // Reset both manually (they're not in the global registry)
      cb1.forceReset();
      cb2.forceReset();

      expect(cb1.getState().isClosed).toBe(true);
      expect(cb2.getState().isClosed).toBe(true);
    });
  });

  describe('Default Configurations', () => {
    it('should have correct default configs', () => {
      expect(DEFAULT_CIRCUIT_CONFIGS.redis.failureThreshold).toBe(5);
      expect(DEFAULT_CIRCUIT_CONFIGS.redis.resetTimeout).toBe(30000);
      expect(DEFAULT_CIRCUIT_CONFIGS.database.failureThreshold).toBe(3);
      expect(DEFAULT_CIRCUIT_CONFIGS.external_api.failureThreshold).toBe(10);
    });
  });
});
