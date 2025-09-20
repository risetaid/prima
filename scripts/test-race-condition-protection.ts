/**
 * Test script for race condition protection
 * Run this with: bun run scripts/test-race-condition-protection.ts
 */

import { distributedLockService } from '../src/services/distributed-lock.service';
import { rateLimitService } from '../src/services/rate-limit.service';
import { logger } from '../src/lib/logger';

async function testDistributedLocks() {
  logger.info('🔒 Testing distributed locks...');

  const testKey = 'test_lock_' + Date.now();
  const results = {
    successful: 0,
    failed: 0,
    concurrent: 0
  };

  // Test concurrent lock acquisition
  const lockPromises = Array.from({ length: 10 }, async (_, index) => {
    try {
      const acquired = await distributedLockService.acquireLock(testKey, {
        ttl: 5000,
        maxRetries: 1
      });

      if (acquired) {
        logger.info(`Lock ${index} acquired successfully`);
        results.successful++;

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100));

        await distributedLockService.releaseLock(testKey);
      } else {
        logger.info(`Lock ${index} failed to acquire (expected)`);
        results.failed++;
      }
    } catch (error) {
      logger.error(`Lock ${index} failed with error`, error as Error);
      results.failed++;
    }
  });

  await Promise.all(lockPromises);

  logger.info('📊 Distributed lock test results:', results);
  return results;
}

async function testRateLimiting() {
  logger.info('🚦 Testing rate limiting...');

  const testKey = 'test_rate_limit_' + Date.now();
  const results = {
    allowed: 0,
    blocked: 0,
    total: 0
  };

  // Test rate limiting (should allow first 5, block subsequent)
  const rateLimitPromises = Array.from({ length: 10 }, async (_, index) => {
    try {
      const result = await rateLimitService.checkRateLimit(testKey, {
        windowMs: 10000, // 10 seconds
        maxRequests: 5
      });

      results.total++;
      if (result.allowed) {
        results.allowed++;
        logger.info(`Request ${index} allowed (${result.remaining} remaining)`);
      } else {
        results.blocked++;
        logger.info(`Request ${index} blocked`);
      }
    } catch (error) {
      logger.error(`Rate limit check ${index} failed`, error as Error);
      results.total++;
    }
  });

  await Promise.all(rateLimitPromises);

  logger.info('📊 Rate limiting test results:', results);
  return results;
}

async function testLockWithFunction() {
  logger.info('🔧 Testing lock with function execution...');

  const testKey = 'test_function_lock_' + Date.now();
  let executionCount = 0;

  const testFunction = async () => {
    executionCount++;
    logger.info(`Function execution #${executionCount} starting...`);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 200));

    logger.info(`Function execution #${executionCount} completed`);
    return `result_${executionCount}`;
  };

  // Try to execute the function concurrently
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      distributedLockService.withLock(testKey, testFunction, {
        ttl: 5000,
        maxRetries: 1
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null)).length;

  logger.info('📊 Lock with function test results:', {
    successful,
    failed,
    executionCount
  });

  return { successful, failed, executionCount };
}

async function testCleanupFunctions() {
  logger.info('🧹 Testing cleanup functions...');

  // Test distributed locks cleanup
  const locksCleaned = await distributedLockService.cleanupExpiredLocks();
  logger.info(`Cleaned ${locksCleaned} expired locks`);

  // Test rate limits cleanup
  const rateLimitsCleaned = await rateLimitService.cleanupOldEntries();
  logger.info(`Cleaned ${rateLimitsCleaned} old rate limit entries`);

  return { locksCleaned, rateLimitsCleaned };
}

async function runTests() {
  logger.info('🧪 Starting race condition protection tests...');

  try {
    console.log('\n=== Race Condition Protection Tests ===\n');

    // Test 1: Distributed Locks
    console.log('1. Testing Distributed Locks');
    const lockResults = await testDistributedLocks();
    console.log('');

    // Test 2: Rate Limiting
    console.log('2. Testing Rate Limiting');
    const rateLimitResults = await testRateLimiting();
    console.log('');

    // Test 3: Lock with Function
    console.log('3. Testing Lock with Function Execution');
    const functionResults = await testLockWithFunction();
    console.log('');

    // Test 4: Cleanup Functions
    console.log('4. Testing Cleanup Functions');
    const cleanupResults = await testCleanupFunctions();
    console.log('');

    // Summary
    console.log('=== Test Summary ===');
    console.log('🔒 Distributed Locks:');
    console.log(`   Successful: ${lockResults.successful}`);
    console.log(`   Failed: ${lockResults.failed}`);
    console.log(`   Concurrent: ${lockResults.concurrent}`);
    console.log('');

    console.log('🚦 Rate Limiting:');
    console.log(`   Allowed: ${rateLimitResults.allowed}`);
    console.log(`   Blocked: ${rateLimitResults.blocked}`);
    console.log(`   Total: ${rateLimitResults.total}`);
    console.log('');

    console.log('🔧 Lock with Function:');
    console.log(`   Successful executions: ${functionResults.successful}`);
    console.log(`   Failed executions: ${functionResults.failed}`);
    console.log(`   Total function calls: ${functionResults.executionCount}`);
    console.log('');

    console.log('🧹 Cleanup:');
    console.log(`   Locks cleaned: ${cleanupResults.locksCleaned}`);
    console.log(`   Rate limits cleaned: ${cleanupResults.rateLimitsCleaned}`);
    console.log('');

    // Validate results
    const lockTestPassed = lockResults.successful === 1 && lockResults.failed === 9;
    const rateLimitTestPassed = rateLimitResults.allowed === 5 && rateLimitResults.blocked === 5;
    const functionTestPassed = functionResults.successful === 1 && functionResults.executionCount === 1;

    console.log('=== Test Results ===');
    console.log(`🔒 Distributed Locks: ${lockTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🚦 Rate Limiting: ${rateLimitTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔧 Lock with Function: ${functionTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    const allTestsPassed = lockTestPassed && rateLimitTestPassed && functionTestPassed;

    if (allTestsPassed) {
      console.log('🎉 All race condition protection tests passed!');
    } else {
      console.log('❌ Some tests failed. Check the logs above for details.');
      process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Test suite failed', error as Error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    logger.error('Test suite failed', error);
    process.exit(1);
  });
}

export { runTests };