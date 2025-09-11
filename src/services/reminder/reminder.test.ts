// Integration tests for centralized reminder system
import { ReminderService } from './reminder.service'
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service'
import { ValidationError, NotFoundError } from './reminder.types'

// Test script to verify the centralized system
async function runTests() {
  console.log('🧪 Running Reminder Service Integration Tests...\n')
  
  const reminderService = new ReminderService()
  const whatsappService = new WhatsAppService()
  let testsPassed = 0
  let testsFailed = 0

  // Test 1: Message Building
  console.log('Test 1: WhatsApp Message Building')
  try {
    const baseMessage = 'Halo Test, jangan lupa minum obat Paracetamol'
    const attachments = [
      { id: '1', type: 'article' as const, title: 'Cara Minum Obat', url: 'https://example.com/article' },
      { id: '2', type: 'video' as const, title: 'Video Edukasi', url: 'https://example.com/video' }
    ]
    
    const message = whatsappService.buildMessage(baseMessage, attachments)
    
    if (message.includes('📚 Baca juga:') && message.includes('🎥 Tonton juga:') && message.includes('💙 Tim PRIMA')) {
      console.log('✅ Message building works correctly')
      testsPassed++
    } else {
      console.log('❌ Message building failed')
      testsFailed++
    }
  } catch (error) {
    console.log('❌ Message building error:', error)
    testsFailed++
  }

  // Test 2: Content Prefix Generation
  console.log('\nTest 2: Content Prefix Generation')
  try {
    const articlePrefix = whatsappService.getContentPrefix('article')
    const videoPrefix = whatsappService.getContentPrefix('video')
    
    if (articlePrefix === '📚 Baca juga:' && videoPrefix === '🎥 Tonton juga:') {
      console.log('✅ Content prefix generation works correctly')
      testsPassed++
    } else {
      console.log('❌ Content prefix generation failed')
      testsFailed++
    }
  } catch (error) {
    console.log('❌ Content prefix error:', error)
    testsFailed++
  }

  // Test 3: Medication Name Extraction
  console.log('\nTest 3: Medication Name Extraction')
  try {
    const service = new ReminderService()
    // Access private method through prototype for testing
    const extractMethod = (service as any).extractMedicationName.bind(service)
    
    const test1 = extractMethod('Jangan lupa minum obat paracetamol')
    const test2 = extractMethod('Waktu minum candesartan 8mg')
    const test3 = extractMethod('Reminder untuk obat')
    
    console.log(`  Extracted: "${test1}", "${test2}", "${test3}"`)
    
    if (test1.toLowerCase() === 'paracetamol' && test2.toLowerCase() === 'candesartan') {
      console.log('✅ Medication extraction works correctly')
      testsPassed++
    } else {
      console.log('❌ Medication extraction needs improvement')
      testsFailed++
    }
  } catch (error) {
    console.log('❌ Medication extraction error:', error)
    testsFailed++
  }

  // Test 4: Error Handling
  console.log('\nTest 4: Error Handling')
  try {
    const validationError = new ValidationError('Test validation error')
    const notFoundError = new NotFoundError('Test not found')
    
    if (validationError.statusCode === 400 && notFoundError.statusCode === 404) {
      console.log('✅ Error handling works correctly')
      testsPassed++
    } else {
      console.log('❌ Error handling failed')
      testsFailed++
    }
  } catch (error) {
    console.log('❌ Error handling error:', error)
    testsFailed++
  }

  // Test 5: Recurrence Date Generation
  console.log('\nTest 5: Recurrence Date Generation')
  try {
    const service = new ReminderService()
    const generateMethod = (service as any).generateRecurrenceDates.bind(service)
    
    const dates = generateMethod({
      frequency: 'day',
      interval: 1,
      endType: 'after',
      occurrences: 7
    })
    
    if (dates.length === 7) {
      console.log(`✅ Generated ${dates.length} daily recurrence dates correctly`)
      testsPassed++
    } else {
      console.log(`❌ Recurrence generation failed - expected 7, got ${dates.length}`)
      testsFailed++
    }
  } catch (error) {
    console.log('❌ Recurrence generation error:', error)
    testsFailed++
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results:`)
  console.log(`   ✅ Passed: ${testsPassed}`)
  console.log(`   ❌ Failed: ${testsFailed}`)
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`)
  console.log('='.repeat(50))

  return { passed: testsPassed, failed: testsFailed }
}

// Export for use in other test runners
export { runTests }

// Run tests if executed directly
if (require.main === module) {
  runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0)
  })
}

