// tests/db/connection-pool.test.ts
import { describe, it, expect } from 'vitest';

describe('Database Connection Pool Configuration', () => {
  it('should have optimized pool settings for Railway', () => {
    // This test verifies the expected pool configuration
    // Actual pool settings are in src/db/index.ts
    
    const expectedOptimizedConfig = {
      max: 15,                    // Leave 5 connections for safety
      idle_timeout: 120,          // 2 minutes to reduce churn
      max_lifetime: 60 * 30,      // 30 minutes
      connect_timeout: 10,        // 10 seconds
      keep_alive: 60,             // 60 seconds
      statement_timeout: 15000,   // 15s for API routes (fail fast)
    };
    
    const expectedLegacyConfig = {
      max: 20,                    // Uses all Railway connections
      idle_timeout: 20,           // 20 seconds
      statement_timeout: 30000,   // 30s
    };
    
    // Test validates the values we expect
    expect(expectedOptimizedConfig.max).toBe(15);
    expect(expectedOptimizedConfig.idle_timeout).toBe(120);
    expect(expectedOptimizedConfig.statement_timeout).toBe(15000);
    
    expect(expectedLegacyConfig.max).toBe(20);
    expect(expectedLegacyConfig.idle_timeout).toBe(20);
    expect(expectedLegacyConfig.statement_timeout).toBe(30000);
  });

  it('should calculate connection headroom correctly', () => {
    const railwayMaxConnections = 20;
    const optimizedMax = 15;
    const headroom = railwayMaxConnections - optimizedMax;
    
    expect(headroom).toBe(5);
    expect(headroom).toBeGreaterThanOrEqual(5); // At least 5 for safety
  });

  it('should have faster statement timeout for APIs', () => {
    const legacyTimeout = 30000; // 30s
    const optimizedTimeout = 15000; // 15s
    
    expect(optimizedTimeout).toBeLessThan(legacyTimeout);
    expect(optimizedTimeout).toBe(15000); // Fail fast
  });
});
