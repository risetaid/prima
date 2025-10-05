#!/usr/bin/env bun

// Debug webhook processing flow for current reminder
import { ConversationStateService } from './src/services/conversation-state.service'
import { PatientLookupService } from './src/services/patient/patient-lookup.service'
import { KeywordMatcherService } from './src/services/keyword-matcher.service'
import { db, reminders } from './src/db'
import { eq, and, desc } from 'drizzle-orm'

console.log('🔍 Debugging webhook processing flow for current reminder...\n')

const TEST_PATIENT_ID = '1f2c2345-58d2-48f4-9b06-f893b81f5b75'
const TEST_PHONE_LOCAL = '081333852187'
const TEST_PHONE_INTL = '6281333852187'
const TEST_MESSAGE = 'sudah'

console.log('📝 Step 1: Check Current Reminder Status')
const currentReminder = await db
  .select()
  .from(reminders)
  .where(and(
    eq(reminders.patientId, TEST_PATIENT_ID),
    eq(reminders.status, 'SENT')
  ))
  .orderBy(desc(reminders.sentAt))
  .limit(1)

if (currentReminder.length > 0) {
  const reminder = currentReminder[0]
  console.log(`  Current Reminder:`)
  console.log(`    ID: ${reminder.id}`)
  console.log(`    Status: ${reminder.status}`)
  console.log(`    Confirmation Status: ${reminder.confirmationStatus}`)
  console.log(`    Sent At: ${reminder.sentAt}`)
  console.log(`    Updated At: ${reminder.updatedAt}`)
} else {
  console.log('  ❌ No current SENT reminder found')
}

console.log('\n📝 Step 2: Test Patient Lookup')
const patientLookup = new PatientLookupService()

for (const phone of [TEST_PHONE_LOCAL, TEST_PHONE_INTL]) {
  const result = await patientLookup.findPatientByPhone(phone)
  console.log(`  ${phone}:`)
  console.log(`    Found: ${result.found}`)
  if (result.found && result.patient) {
    console.log(`    Patient ID: ${result.patient.id}`)
    console.log(`    Phone in DB: ${result.patient.phoneNumber}`)
  }
}

console.log('\n📝 Step 3: Test Active Context Check')
const conversationService = new ConversationStateService()
const activeContext = await conversationService.getActiveContext(TEST_PATIENT_ID)
console.log(`  Active context: ${activeContext}`)

console.log('\n📝 Step 4: Test Conversation State Lookup')
for (const phone of [TEST_PHONE_LOCAL, TEST_PHONE_INTL]) {
  const state = await conversationService.findByPhoneNumber(phone)
  console.log(`  ${phone}:`)
  if (state) {
    console.log(`    State ID: ${state.id}`)
    console.log(`    Context: ${state.currentContext}`)
    console.log(`    Related Entity ID: ${state.relatedEntityId}`)
    console.log(`    Related Entity Type: ${state.relatedEntityType}`)
    console.log(`    Is Active: ${state.isActive}`)
    console.log(`    Expires At: ${state.expiresAt}`)

    // Check if expired
    const now = new Date()
    const isExpired = state.expiresAt < now
    console.log(`    Is Expired: ${isExpired}`)
    if (isExpired) {
      console.log(`    ❌ Context expired ${Math.round((now.getTime() - state.expiresAt.getTime()) / (1000 * 60 * 60))} hours ago`)
    }
  } else {
    console.log('    ❌ No state found')
  }
}

console.log('\n📝 Step 5: Test Keyword Matching')
const keywordMatcher = new KeywordMatcherService()
const matchResult = keywordMatcher.matchConfirmation(TEST_MESSAGE)
console.log(`  Message "${TEST_MESSAGE}" → ${matchResult}`)

console.log('\n📝 Step 6: Test Fallback Logic (Simple Reminder Confirmation)')
if (currentReminder.length > 0) {
  const reminder = currentReminder[0]
  console.log(`  Testing fallback with reminder ${reminder.id}:`)
  console.log(`    Reminder Status: ${reminder.status}`)
  console.log(`    Confirmation Status: ${reminder.confirmationStatus}`)
  console.log(`    Sent At: ${reminder.sentAt}`)

  // This simulates the fallback logic in the webhook
  const confirmationMatch = keywordMatcher.matchConfirmation(TEST_MESSAGE)
  console.log(`    Keyword Match: ${confirmationMatch}`)

  if (confirmationMatch !== 'invalid') {
    console.log(`    ✅ Fallback logic should process this reminder`)
  } else {
    console.log(`    ❌ Fallback logic would not process this reminder`)
  }
} else {
  console.log('  ❌ No reminder to test fallback logic')
}

console.log('\n🎯 Analysis Summary:')
console.log('1. If context is expired → webhook should use fallback logic')
console.log('2. If fallback logic works → reminder should be updated')
console.log('3. If no update → webhook is not being called or failing silently')
console.log('\nIf webhooks are not working:')
console.log('- Check Fonnte webhook configuration')
console.log('- Check server logs for incoming webhook requests')
console.log('- Check if webhook URL is accessible from internet')

console.log('\n✅ Debug flow completed!')