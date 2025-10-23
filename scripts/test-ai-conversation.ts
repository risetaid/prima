// Test script for AI Conversational Health Assistant
import { getAIConversationService } from '@/services/ai/ai-conversation.service';
import { logger } from '@/lib/logger';
import type { AIConversationContext } from '@/lib/ai-types';

// Real Indonesian health question samples
const testQuestions = {
  medication: [
    'Obat kemo bikin mual, normal ga?',
    'Boleh minum obat dengan makanan?',
    'Kenapa harus minum obat 3x sehari?',
    'Lupa minum obat pagi, gimana?',
    'Efek samping obat merah apa?',
  ],
  schedule: [
    'Kapan jadwal kontrol dokter?',
    'Jam berapa harus ke RS?',
    'Besok ada jadwal apa?',
  ],
  sideEffects: [
    'Rambut rontok gara-gara kemo ya?',
    'Badan lemes terus, wajar ga?',
    'Mulut sariawan parah',
    'Kulit kering banget',
  ],
  emergency: [
    'Sesak nafas parah tolong',
    'Muntah darah',
    'Demam tinggi ga turun',
    'Pusing parah sekali',
  ],
  complex: [
    'Bisa ganti dosis obat?',
    'Stop obat dulu boleh ga?',
    'Hasil lab menunjukkan apa?',
  ],
};

async function testConversationalAI() {
  console.log('\n🤖 Testing AI Conversational Health Assistant\n');
  console.log('='.repeat(80));

  const service = getAIConversationService();
  const results: {
    category: string;
    question: string;
    response: string;
    shouldEscalate: boolean;
    suggestedAction: string;
    escalationReason?: string;
    tokensUsed: number;
    responseTime: number;
    cost: number;
  }[] = [];

  let totalCost = 0;
  let totalTokens = 0;
  let emergencyCount = 0;
  let escalationCount = 0;

  // Test patient context
  const testContext: AIConversationContext = {
    patientId: 'test_patient_123',
    patientName: 'Budi',
    conversationHistory: [],
    patientContext: {
      cancerStage: 'Stage 2',
      currentMedications: ['Doxorubicin', 'Cisplatin'],
    },
  };

  // Test each category
  for (const [category, questions] of Object.entries(testQuestions)) {
    console.log(`\n📋 Testing: ${category}`);
    console.log('-'.repeat(80));

    for (const question of questions) {
      try {
        console.log(`\n❓ Question: "${question}"`);

        const startTime = Date.now();
        const result = await service.respond(question, testContext);
        const responseTime = Date.now() - startTime;

        // Track metrics
        totalCost += result.metadata.cost;
        totalTokens += result.metadata.tokensUsed;
        if (result.suggestedAction === 'mark_emergency') emergencyCount++;
        if (result.shouldEscalate) escalationCount++;

        // Store result
        results.push({
          category,
          question,
          response: result.message,
          shouldEscalate: result.shouldEscalate,
          suggestedAction: result.suggestedAction,
          escalationReason: result.escalationReason,
          tokensUsed: result.metadata.tokensUsed,
          responseTime,
          cost: result.metadata.cost,
        });

        // Display result
        const escalateIcon = result.shouldEscalate ? '⚠️' : '✅';
        const actionIcon =
          result.suggestedAction === 'mark_emergency'
            ? '🚨'
            : result.suggestedAction === 'notify_volunteer'
            ? '📢'
            : '💬';

        console.log(`${escalateIcon} ${actionIcon} Response:`);
        console.log(`   ${result.message.substring(0, 200)}...`);
        console.log(`\n   📊 Metrics:`);
        console.log(`   • Tokens: ${result.metadata.tokensUsed}`);
        console.log(`   • Response Time: ${responseTime}ms`);
        console.log(`   • Cost: $${result.metadata.cost.toFixed(6)}`);
        console.log(`   • Escalate: ${result.shouldEscalate ? 'YES' : 'NO'}`);
        console.log(`   • Action: ${result.suggestedAction}`);
        if (result.escalationReason) {
          console.log(`   • Reason: ${result.escalationReason}`);
        }

        // Add to conversation history for multi-turn testing
        testContext.conversationHistory.push(
          {
            role: 'user',
            content: question,
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
          }
        );

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  console.log(`\n💰 Total Cost: $${totalCost.toFixed(6)}`);
  console.log(`📈 Total Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`💬 Total Questions: ${results.length}`);
  console.log(`📢 Escalations: ${escalationCount}`);
  console.log(`🚨 Emergencies: ${emergencyCount}`);
  console.log(`💵 Avg Cost per Question: $${(totalCost / results.length).toFixed(6)}`);
  console.log(`🔢 Avg Tokens per Question: ${Math.round(totalTokens / results.length)}`);

  // Breakdown by category
  console.log('\n📋 Results by Category:');
  for (const [category, questions] of Object.entries(testQuestions)) {
    const categoryResults = results.filter((r) => r.category === category);
    const categoryEscalations = categoryResults.filter((r) => r.shouldEscalate).length;
    const categoryEmergencies = categoryResults.filter(
      (r) => r.suggestedAction === 'mark_emergency'
    ).length;
    const avgCost =
      categoryResults.reduce((sum, r) => sum + r.cost, 0) / categoryResults.length;
    const avgTokens =
      categoryResults.reduce((sum, r) => sum + r.tokensUsed, 0) / categoryResults.length;

    console.log(`\n  ${category}:`);
    console.log(`    • Questions: ${categoryResults.length}`);
    console.log(`    • Escalations: ${categoryEscalations} (${((categoryEscalations/categoryResults.length)*100).toFixed(1)}%)`);
    console.log(`    • Emergencies: ${categoryEmergencies}`);
    console.log(`    • Avg Cost: $${avgCost.toFixed(6)}`);
    console.log(`    • Avg Tokens: ${Math.round(avgTokens)}`);
  }

  // Response quality analysis
  console.log('\n📊 Response Quality Analysis:');
  const appropriateEscalations = results.filter(
    (r) =>
      (r.category === 'emergency' && r.shouldEscalate) ||
      (r.category === 'complex' && r.shouldEscalate) ||
      (r.category !== 'emergency' && r.category !== 'complex' && !r.shouldEscalate)
  ).length;
  const escalationAccuracy = (appropriateEscalations / results.length) * 100;
  console.log(`  Appropriate Escalations: ${escalationAccuracy.toFixed(1)}%`);

  // Monthly cost projections
  console.log('\n💰 Monthly Cost Projections:');
  const avgCostPerQuestion = totalCost / results.length;
  console.log(`  1,000 questions/month: $${(avgCostPerQuestion * 1000).toFixed(2)}`);
  console.log(`  5,000 questions/month: $${(avgCostPerQuestion * 5000).toFixed(2)}`);
  console.log(`  10,000 questions/month: $${(avgCostPerQuestion * 10000).toFixed(2)}`);

  // Sample responses
  console.log('\n💬 Sample Responses:');
  console.log('\n  Non-Emergency (General Info):');
  const generalResponse = results.find(
    (r) => r.category === 'medication' && !r.shouldEscalate
  );
  if (generalResponse) {
    console.log(`    Q: ${generalResponse.question}`);
    console.log(`    A: ${generalResponse.response.substring(0, 150)}...`);
  }

  console.log('\n  Emergency (Escalated):');
  const emergencyResponse = results.find((r) => r.category === 'emergency');
  if (emergencyResponse) {
    console.log(`    Q: ${emergencyResponse.question}`);
    console.log(`    A: ${emergencyResponse.response.substring(0, 150)}...`);
    console.log(`    Action: ${emergencyResponse.suggestedAction}`);
  }

  console.log('\n✅ Test complete!\n');
}

// Run tests
testConversationalAI().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
