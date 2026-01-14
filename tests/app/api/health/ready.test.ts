// tests/app/api/health/ready.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/ready/route';

describe('/api/health/ready', () => {
  it('should return health check structure with all service checks', async () => {
    const response = await GET();
    const data = await response.json();

    // Status should be either 200 (ready) or 503 (not ready)
    expect([200, 503]).toContain(response.status);
    expect(data.status).toMatch(/^(ready|not_ready)$/);
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('redis');
    expect(data.checks).toHaveProperty('gowa');
    
    // Each check should have required fields
    expect(data.checks.database).toHaveProperty('healthy');
    expect(data.checks.database).toHaveProperty('latency_ms');
    expect(data.checks.redis).toHaveProperty('healthy');
    expect(data.checks.redis).toHaveProperty('latency_ms');
    expect(data.checks.gowa).toHaveProperty('healthy');
    expect(data.checks.gowa).toHaveProperty('latency_ms');
  });
});
