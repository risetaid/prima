// src/lib/feature-flag-config.ts
/**
 * Feature flag definitions for PRIMA Railway optimization
 * All flags default to false for safety
 */

export type FlagCategory = 'SECURITY' | 'PERFORMANCE' | 'DATABASE' | 'OBSERVABILITY';

export interface FlagDefinition {
  name: string;
  category: FlagCategory;
  description: string;
  defaultEnabled: boolean;
}

export const FLAG_DEFINITIONS: Record<string, FlagDefinition> = {
  // Phase 1: Security Fixes
  SECURITY_ATOMIC_IDEMPOTENCY: {
    name: 'SECURITY_ATOMIC_IDEMPOTENCY',
    category: 'SECURITY',
    description: 'Use atomic Redis SET NX EX for idempotency checks',
    defaultEnabled: false,
  },
  SECURITY_STRICT_ENV_VALIDATION: {
    name: 'SECURITY_STRICT_ENV_VALIDATION',
    category: 'SECURITY',
    description: 'Enforce strict environment variable validation on startup',
    defaultEnabled: false,
  },
  SECURITY_TIMING_SAFE_AUTH: {
    name: 'SECURITY_TIMING_SAFE_AUTH',
    category: 'SECURITY',
    description: 'Use timing-safe comparison for API key validation',
    defaultEnabled: false,
  },
  SECURITY_SAFE_ROLE_DEMOTION: {
    name: 'SECURITY_SAFE_ROLE_DEMOTION',
    category: 'SECURITY',
    description: 'Fix privilege escalation bug in role demotion logic',
    defaultEnabled: false,
  },

  // Phase 2: Performance Optimizations
  PERF_OPTIMIZED_POOL: {
    name: 'PERF_OPTIMIZED_POOL',
    category: 'PERFORMANCE',
    description: 'Use optimized database connection pool settings',
    defaultEnabled: false,
  },
  PERF_WHATSAPP_RETRY: {
    name: 'PERF_WHATSAPP_RETRY',
    category: 'PERFORMANCE',
    description: 'Enable retry logic with exponential backoff for WhatsApp sends',
    defaultEnabled: false,
  },
  PERF_BATCH_CLEANUP: {
    name: 'PERF_BATCH_CLEANUP',
    category: 'PERFORMANCE',
    description: 'Use batch operations for conversation cleanup',
    defaultEnabled: false,
  },
  PERF_PAGINATION_BOUNDS: {
    name: 'PERF_PAGINATION_BOUNDS',
    category: 'PERFORMANCE',
    description: 'Enforce pagination bounds to prevent DoS',
    defaultEnabled: false,
  },
  PERF_GRACEFUL_SHUTDOWN: {
    name: 'PERF_GRACEFUL_SHUTDOWN',
    category: 'PERFORMANCE',
    description: 'Enable graceful shutdown on SIGTERM/SIGINT',
    defaultEnabled: false,
  },

  // Phase 3: Database Optimizations
  DATABASE_OPTIMIZED_QUERIES: {
    name: 'DATABASE_OPTIMIZED_QUERIES',
    category: 'DATABASE',
    description: 'Use optimized queries with new composite indexes',
    defaultEnabled: false,
  },
};
