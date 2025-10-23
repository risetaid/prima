// Test script for AI Intent Classification with real Indonesian messages
import { getAIIntentService } from '@/services/ai/ai-intent.service';
import { logger } from '@/lib/logger';

// Real Indonesian patient message samples
const testMessages = {
  reminderConfirmed: [
    'sudah',
    'sudah minum obat',
    'sudah minum obat tadi pagi',
    'selesai',
    'ok sudah',
    'done',
    'udah diminum',
    'iya sudah',
    'sudah kok',
    'alhamdulillah sudah',
  ],
  reminderMissed: [
    'belum',
    'belum sempat',
    'belum minum',
    'lupa',
    'kelewatan',
    'belum sempat, nanti sore',
    'maaf lupa',
    'ketiduran, belum minum',
    'belum ada waktu',
    'not yet',
  ],
  verificationAccept: [
    'ya',
    'iya',
    'yes',
    'setuju',
    'boleh',
    'ok',
    'oke',
    'boleh dong',
    'ya setuju',
    'silakan',
    'terima kasih, boleh',
  ],
  verificationDecline: [
    'tidak',
    'no',
    'tolak',
    'ga mau',
    'gak mau',
    'engga',
    'ga usah',
    'jangan',
    'maaf tidak',
    'nggak perlu',
  ],
  healthQuestion: [
    'kapan jadwal dokter?',
    'obat ini bikin mual ya?',
    'efek sampingnya apa?',
    'boleh diminum dengan makanan?',
    'kenapa harus minum 3x sehari?',
    'apa bedanya obat merah dan biru?',
  ],
  emergency: [
    'sesak nafas parah',
    'muntah darah',
    'darurat tolong',
    'pusing parah sekali',
    'pingsan',
    'demam tinggi ga turun',
    'nyeri dada sakit banget',
  ],
  unclear: [
    '👍',
    'ok',
    'hm',
    'test',
    '...',
    'apa?',
    'hmm mungkin',
  ],
};

async function testAIIntent() {
  console.log('\n🤖 Testing AI Intent Classification with Real Indonesian Messages\n');
  console.log('=' .repeat(80));

  const service = getAIIntentService();
  const results: {
    category: string;
    message: string;
    intent: string;
    confidence: number;
    confidenceLevel: string;
    reasoning: string;
    correct: boolean;
  }[] = [];

  let totalTests = 0;
  let correctClassifications = 0;
  let totalCost = 0;

  // Test each category
  for (const [expectedIntent, messages] of Object.entries(testMessages)) {
    console.log(`\n📋 Testing: ${expectedIntent}`);
    console.log('-'.repeat(80));

    for (const message of messages) {
      totalTests++;
      try {
        const result = await service.classifyIntent(message, {
          expectedContext: expectedIntent.includes('reminder')
            ? 'reminder_confirmation'
            : expectedIntent.includes('verification')
            ? 'verification'
            : 'general',
        });

        // Determine if classification was correct
        const correct =
          (expectedIntent === 'reminderConfirmed' && result.intent === 'reminder_confirmed') ||
          (expectedIntent === 'reminderMissed' && result.intent === 'reminder_missed') ||
          (expectedIntent === 'verificationAccept' && result.intent === 'verification_accept') ||
          (expectedIntent === 'verificationDecline' && result.intent === 'verification_decline') ||
          (expectedIntent === 'healthQuestion' && result.intent === 'health_question') ||
          (expectedIntent === 'emergency' && result.intent === 'emergency') ||
          (expectedIntent === 'unclear' && result.intent === 'unclear');

        if (correct) correctClassifications++;

        results.push({
          category: expectedIntent,
          message,
          intent: result.intent,
          confidence: result.confidence,
          confidenceLevel: result.confidenceLevel,
          reasoning: result.reasoning,
          correct,
        });

        const icon = correct ? '✅' : '❌';
        const confIcon =
          result.confidenceLevel === 'high' ? '🟢' :
          result.confidenceLevel === 'medium' ? '🟡' : '🔴';

        console.log(`${icon} ${confIcon} "${message}"`);
        console.log(`   → ${result.intent} (${result.confidence}% - ${result.confidenceLevel})`);
        if (!correct) {
          console.log(`   ⚠️  Expected: ${expectedIntent}`);
        }
        console.log(`   💭 ${result.reasoning.substring(0, 100)}...`);
        console.log('');

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Error testing "${message}":`, error);
        results.push({
          category: expectedIntent,
          message,
          intent: 'error',
          confidence: 0,
          confidenceLevel: 'low',
          reasoning: error instanceof Error ? error.message : 'Unknown error',
          correct: false,
        });
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const accuracy = (correctClassifications / totalTests) * 100;
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Correct: ${correctClassifications}`);
  console.log(`Incorrect: ${totalTests - correctClassifications}`);
  console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

  // Get AI client stats
  const stats = service.getStats();
  console.log(`\n💰 Cost: $${stats.aiClientStats.totalCost.toFixed(6)}`);
  console.log(`📈 Total Requests: ${stats.aiClientStats.requestCount}`);
  console.log(`💵 Avg Cost per Request: $${stats.aiClientStats.averageCostPerRequest.toFixed(6)}`);

  // Breakdown by category
  console.log('\n📋 Accuracy by Category:');
  for (const [category, messages] of Object.entries(testMessages)) {
    const categoryResults = results.filter(r => r.category === category);
    const categoryCorrect = categoryResults.filter(r => r.correct).length;
    const categoryAccuracy = (categoryCorrect / categoryResults.length) * 100;
    console.log(`  ${category}: ${categoryAccuracy.toFixed(1)}% (${categoryCorrect}/${categoryResults.length})`);
  }

  // Confidence distribution
  console.log('\n📊 Confidence Distribution:');
  const highConf = results.filter(r => r.confidenceLevel === 'high').length;
  const medConf = results.filter(r => r.confidenceLevel === 'medium').length;
  const lowConf = results.filter(r => r.confidenceLevel === 'low').length;
  console.log(`  High (80-100%): ${highConf} (${((highConf/totalTests)*100).toFixed(1)}%)`);
  console.log(`  Medium (60-79%): ${medConf} (${((medConf/totalTests)*100).toFixed(1)}%)`);
  console.log(`  Low (0-59%): ${lowConf} (${((lowConf/totalTests)*100).toFixed(1)}%)`);

  // Failed classifications
  const failed = results.filter(r => !r.correct);
  if (failed.length > 0) {
    console.log('\n❌ Misclassifications:');
    failed.forEach(f => {
      console.log(`  • "${f.message}"`);
      console.log(`    Expected: ${f.category} | Got: ${f.intent} (${f.confidence}%)`);
    });
  }

  console.log('\n✅ Test complete!\n');
}

// Run tests
testAIIntent().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
