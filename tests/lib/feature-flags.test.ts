// tests/lib/feature-flags.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureFlags } from '@/lib/feature-flags';

describe('FeatureFlags', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should default to false when flag not set', () => {
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should return true when flag set to true', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'true';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(true);
  });

  it('should return false when flag set to false', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'false';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should handle invalid flag values gracefully', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'invalid';
    const flags = new FeatureFlags();
    expect(flags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')).toBe(false);
  });

  it('should track flag metadata', () => {
    process.env.FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY = 'true';
    const flags = new FeatureFlags();
    const metadata = flags.getMetadata('SECURITY_ATOMIC_IDEMPOTENCY');
    
    expect(metadata?.enabled).toBe(true);
    expect(metadata?.enabledAt).toBeInstanceOf(Date);
  });
});
