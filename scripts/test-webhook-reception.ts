#!/usr/bin/env bun
/**
 * Test if GOWA webhook is receiving messages
 *
 * This script checks recent webhook processing logs
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkRecentWebhookActivity() {
  console.log('🔍 Checking recent webhook activity for 6281333852187...\n');

  // Check conversation_messages for recent activity
  const recentMessages = await db.execute(sql`
    SELECT
      cm.id,
      cm.message,
      cm.direction,
      cm.created_at,
      cm.processed_at,
      cm.intent,
      cs.phone_number,
      p.name as patient_name
    FROM conversation_messages cm
    JOIN conversation_states cs ON cm.conversation_state_id = cs.id
    JOIN patients p ON cs.patient_id = p.id
    WHERE cs.phone_number = '6281333852187'
    ORDER BY cm.created_at DESC
    LIMIT 10
  `);

  console.log('📨 Recent conversation messages:');
  console.log(JSON.stringify(recentMessages.rows, null, 2));

  // Check if there are any recent reminders
  const recentReminders = await db.execute(sql`
    SELECT
      r.id,
      r.message,
      r.send_at,
      r.status,
      p.name as patient_name,
      p.phone_number
    FROM reminders r
    JOIN patients p ON r.patient_id = p.id
    WHERE p.phone_number = '6281333852187'
    ORDER BY r.created_at DESC
    LIMIT 5
  `);

  console.log('\n📅 Recent reminders:');
  console.log(JSON.stringify(recentReminders.rows, null, 2));

  // Check patient status
  const patientInfo = await db.execute(sql`
    SELECT
      id,
      name,
      phone_number,
      verification_status,
      is_active,
      created_at,
      updated_at
    FROM patients
    WHERE phone_number = '6281333852187'
  `);

  console.log('\n👤 Patient info:');
  console.log(JSON.stringify(patientInfo.rows, null, 2));

  // Check conversation states
  const conversationStates = await db.execute(sql`
    SELECT
      cs.id,
      cs.phone_number,
      cs.current_context,
      cs.last_message,
      cs.last_message_at,
      cs.message_count,
      cs.is_active,
      p.name as patient_name
    FROM conversation_states cs
    JOIN patients p ON cs.patient_id = p.id
    WHERE cs.phone_number = '6281333852187'
    ORDER BY cs.updated_at DESC
  `);

  console.log('\n💬 Conversation states:');
  console.log(JSON.stringify(conversationStates.rows, null, 2));
}

checkRecentWebhookActivity()
  .then(() => {
    console.log('\n✅ Diagnostic complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
