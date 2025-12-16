// src/lib/env-validator.ts
import { logger } from '@/lib/logger';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'GOWA_ENDPOINT',
  'GOWA_WEBHOOK_SECRET',
  'INTERNAL_API_KEY',
  'REDIS_URL',
] as const;

const OPTIONAL_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
] as const;

/**
 * Validate required environment variables
 * Throws error if any required var is missing or empty
 */
export function validateRequiredEnv(): void {
  // Only enforce if flag is enabled
  if (process.env.FEATURE_FLAG_SECURITY_STRICT_ENV_VALIDATION !== 'true') {
    return;
  }

  const missing: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('Environment validation failed', error, {
      operation: 'env.validation',
      missing,
    });
    throw error;
  }

  logger.info('Environment validation passed', {
    operation: 'env.validation',
    required_vars: REQUIRED_ENV_VARS.length,
  });
}

/**
 * Validate optional environment variables
 * Warns if missing but doesn't throw
 */
export function validateOptionalEnv(): void {
  const missing: string[] = [];

  for (const varName of OPTIONAL_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    logger.warn('Optional environment variables not configured', {
      operation: 'env.validation',
      missing,
    });
  }
}

/**
 * Run all environment validation
 * Call this on application startup
 */
export function validateEnvironment(): void {
  validateRequiredEnv();
  validateOptionalEnv();
}
