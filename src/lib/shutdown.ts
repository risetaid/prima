// src/lib/shutdown.ts
import { logger } from './logger';
import { featureFlags } from './feature-flags';

let isShuttingDown = false;

/**
 * Graceful shutdown handler for Railway deployments
 * Railway sends SIGTERM 30 seconds before killing the dyno
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  isShuttingDown = true;
  logger.info('Graceful shutdown initiated', {
    signal,
    operation: 'shutdown.start',
  });

  try {
    // Step 1: Stop accepting new requests (Next.js handles this automatically)
    logger.info('Stopping new request acceptance');

    // Step 2: Wait for pending requests to complete (30s grace period)
    const gracePeriodMs = 30000;
    logger.info('Waiting for pending requests to complete', {
      gracePeriodMs,
    });
    await new Promise(resolve => setTimeout(resolve, gracePeriodMs));

    // Step 3: Close Redis connection
    logger.info('Closing Redis connection');
    try {
      const { redis } = await import('./redis');
      await redis.quit();
      logger.info('Redis connection closed successfully');
    } catch (error) {
      logger.error('Failed to close Redis connection', error instanceof Error ? error : undefined);
    }

    // Step 4: Close database connection pool
    logger.info('Closing database connection pool');
    try {
      const { db } = await import('@/db');
      // postgres.js closes connections automatically on process exit
      // but we can explicitly end it
      logger.info('Database connections will close on process exit');
    } catch (error) {
      logger.error('Failed to close database connections', error instanceof Error ? error : undefined);
    }

    logger.info('Graceful shutdown complete', {
      operation: 'shutdown.complete',
    });
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error instanceof Error ? error : undefined);
    process.exit(1);
  }
}

/**
 * Register graceful shutdown handlers
 * Call this once at application startup
 */
export function registerShutdownHandlers() {
  if (!featureFlags.isEnabled('PERF_GRACEFUL_SHUTDOWN')) {
    logger.info('Graceful shutdown handlers not registered (feature flag disabled)');
    return;
  }

  // SIGTERM: Railway sends this 30 seconds before killing dyno
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
    shutdown('SIGTERM');
  });

  // SIGINT: Ctrl+C during development
  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
    shutdown('SIGINT');
  });

  // Uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
    shutdown('unhandledRejection');
  });

  logger.info('Graceful shutdown handlers registered', {
    signals: ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection'],
  });
}
