#!/usr/bin/env tsx

/**
 * Test script for WhatsApp verification webhook
 * Tests the fix for duplicate verification responses
 */

import { db, patients } from '@/db'
import { eq } from 'drizzle-orm'

async function testVerificationWebhook() {
  console.log('🧪 Testing WhatsApp Verification Webhook Fix\n')

  // Find a verified patient to test with
  const verifiedPatient = await db
    .select()
    .from(patients)
    .where(eq(patients.verificationStatus, 'verified'))
    .limit(1)

  if (verifiedPatient.length === 0) {
    console.log('❌ No verified patients found. Please verify a patient first.')
    return
  }

  const patient = verifiedPatient[0]
  console.log(`✅ Found verified patient: ${patient.name}`)
  console.log(`📱 Phone: ${patient.phoneNumber}`)
  console.log(`🔒 Status: ${patient.verificationStatus}\n`)

  // Test messages that should NOT trigger verification responses
  const testMessages = [
    'tes',
    'halo',
    'bagaimana kabarmu?',
    'sudah minum obat?',
    'YA', // This should NOT trigger verification for already verified patient
    'TIDAK',
    'BERHENTI'
  ]

  console.log('📤 Simulating incoming messages...\n')

  for (const message of testMessages) {
    console.log(`💬 Testing message: "${message}"`)

    // Simulate webhook call
    try {
      const response = await fetch('http://localhost:3000/api/webhooks/verification-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device: '628594257362',
          sender: patient.phoneNumber,
          message: message,
          name: patient.name
        })
      })

      const result = await response.json()
      console.log(`   Response: ${response.status} - ${result.message}`)

      if (response.status === 200 && result.message.includes('logged for verified patient')) {
        console.log('   ✅ Correctly handled - message logged but status unchanged')
      } else if (response.status === 200 && result.message.includes('not waiting for verification')) {
        console.log('   ✅ Correctly handled - message ignored for non-pending status')
      } else {
        console.log('   ⚠️  Unexpected response')
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error}`)
    }

    console.log('')
  }

  // Check final patient status
  const finalPatient = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1)

  if (finalPatient.length > 0) {
    console.log(`🔍 Final patient status: ${finalPatient[0].verificationStatus}`)
    if (finalPatient[0].verificationStatus === 'verified') {
      console.log('✅ SUCCESS: Patient status remained unchanged!')
    } else {
      console.log('❌ FAILURE: Patient status was modified unexpectedly!')
    }
  }

  console.log('\n🎉 Test completed!')
}

testVerificationWebhook().catch(console.error)
