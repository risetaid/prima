#!/usr/bin/env tsx

/**
 * Test script for the Redis-based Followup Automation System
 * Tests scheduling, processing, and response handling
 */

import { FollowupService } from '../src/services/reminder/followup.service';
import { FollowupQueueService } from '../src/services/reminder/followup-queue.service';
import { logger } from '../src/lib/logger';

async function testFollowupSystem() {
  console.log('🧪 Testing Followup Automation System...\n');

  const followupService = new FollowupService();
  const queueService = new FollowupQueueService();

  try {
    // Test 1: Schedule medication followups
    console.log('📅 Test 1: Scheduling medication followups...');
    const followupIds = await followupService.scheduleMedicationFollowups({
      patientId: 'test-patient-123',
      reminderId: 'test-reminder-456',
      phoneNumber: '+6281234567890',
      patientName: 'Test Patient',
      medicationName: 'Paracetamol 500mg',
    });

    console.log(`✅ Scheduled ${followupIds.length} followups:`, followupIds);

    // Test 2: Check queue stats
    console.log('\n📊 Test 2: Checking queue stats...');
    const queueStats = await queueService.getQueueStats();
    console.log('Queue stats:', queueStats);

    // Test 3: Process pending followups (simulate cron job)
    console.log('\n⚙️ Test 3: Processing pending followups...');
    const processingResults = await followupService.processPendingFollowups();
    console.log(`Processed ${processingResults.length} followups:`);
    processingResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.followupId}: ${result.status} (${result.processed ? '✅' : '❌'})`);
    });

    // Test 4: Simulate patient response
    console.log('\n💬 Test 4: Simulating patient response...');
    if (followupIds.length > 0) {
      const responseResult = await followupService.processFollowupResponse(
        'test-patient-123',
        '+6281234567890',
        'SUDAH saya minum obatnya'
      );
      console.log('Response processed:', responseResult);
    }

    // Test 5: Get followup stats
    console.log('\n📈 Test 5: Getting followup stats...');
    const stats = await followupService.getFollowupStats('test-patient-123');
    console.log('Followup stats:', stats);

    // Test 6: Clean up expired followups
    console.log('\n🧹 Test 6: Cleaning up expired followups...');
    await followupService.cleanupExpiredFollowups();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Followup system test failed', error as Error);
  }
}

// Run the test
testFollowupSystem().catch(console.error);