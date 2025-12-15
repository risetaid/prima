// tests/app/api/admin/migration-health.test.ts
import { describe, it, expect } from 'vitest';

describe('/api/admin/migration-health', () => {
  it('should exist and be importable', async () => {
    // Basic test to verify route module exists
    // Full authentication testing would require Clerk mocking
    const module = await import('@/app/api/admin/migration-health/route');
    expect(module).toHaveProperty('GET');
    expect(typeof module.GET).toBe('function');
  });
});
