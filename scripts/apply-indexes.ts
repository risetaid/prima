/**
 * Apply Database Indexes for Performance Optimization
 * This script adds missing indexes to improve query performance
 */

import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

async function applyIndexes() {
  logger.info('Starting database index optimization...')

  try {
    // Indexes for frequently queried fields
    
    // Users table indexes
    const userIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;',
      'CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, is_approved) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE is_active = true;',
    ]

    // Patients table indexes  
    const patientIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_patients_volunteer_active ON patients(assigned_volunteer_id, is_active) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_patients_phone_number ON patients(phone_number) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_patients_verification_status ON patients(verification_status, verification_sent_at) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_patients_created_at_desc ON patients(created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_patients_name_search ON patients USING gin(to_tsvector(\'indonesian\', name)) WHERE deleted_at IS NULL;',
    ]

    // Reminders table indexes
    const reminderIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_reminders_patient_scheduled ON reminders(patient_id, scheduled_time) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_reminders_status_active ON reminders(status, is_active) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time_status ON reminders(scheduled_time, status) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_reminders_created_at_desc ON reminders(created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_reminders_frequency_start_date ON reminders(frequency, start_date) WHERE deleted_at IS NULL;',
    ]

    // Manual confirmations table indexes
    const manualConfirmationIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_manual_confirmations_patient_visit ON manual_confirmations(patient_id, visit_date DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_manual_confirmations_volunteer_patient ON manual_confirmations(volunteer_id, patient_id) WHERE deleted_at IS NULL;',
    ]

    // Medical records table indexes
    const medicalRecordIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_medical_records_patient_type ON medical_records(patient_id, record_type) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_medical_records_created_at_desc ON medical_records(created_at DESC) WHERE deleted_at IS NULL;',
    ]

    // Conversation states table indexes
    const conversationStateIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_conversation_states_patient_active ON conversation_states(patient_id, is_active) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_conversation_states_updated_at_desc ON conversation_states(updated_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_conversation_states_expected_response ON conversation_states(expected_response_type, is_active) WHERE deleted_at IS NULL;',
    ]

    // Conversation messages table indexes
    const conversationMessageIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_conversation_messages_state_created ON conversation_messages(conversation_state_id, created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_conversation_messages_direction ON conversation_messages(direction, created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_conversation_messages_intent ON conversation_messages(intent, created_at DESC) WHERE deleted_at IS NULL;',
    ]

    // CMS Articles table indexes
    const cmsArticleIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_cms_articles_status_published ON cms_articles(status, published_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_articles_updated_at_desc ON cms_articles(updated_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_articles_slug ON cms_articles(slug) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_articles_title_search ON cms_articles USING gin(to_tsvector(\'indonesian\', title)) WHERE deleted_at IS NULL;',
    ]

    // CMS Videos table indexes
    const cmsVideoIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_cms_videos_status_published ON cms_videos(status, published_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_videos_updated_at_desc ON cms_videos(updated_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_videos_slug ON cms_videos(slug) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_cms_videos_title_search ON cms_videos USING gin(to_tsvector(\'indonesian\', title)) WHERE deleted_at IS NULL;',
    ]

    // Message queue table indexes (if exists)
    const messageQueueIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_message_queue_status_created ON message_queue(status, created_at) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_message_queue_retry_count ON message_queue(retry_count, next_retry_at) WHERE deleted_at IS NULL;',
    ]

    // Volunteer notifications table indexes
    const volunteerNotificationIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_volunteer_notifications_patient_unread ON volunteer_notifications(patient_id, is_read, created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_volunteer_notifications_volunteer_created ON volunteer_notifications(volunteer_id, created_at DESC) WHERE deleted_at IS NULL;',
    ]

    // Combine all indexes
    const allIndexes = [
      ...userIndexes,
      ...patientIndexes,
      ...reminderIndexes,
      ...manualConfirmationIndexes,
      ...medicalRecordIndexes,
      ...conversationStateIndexes,
      ...conversationMessageIndexes,
      ...cmsArticleIndexes,
      ...cmsVideoIndexes,
      ...messageQueueIndexes,
      ...volunteerNotificationIndexes,
    ]

    // Apply indexes in batches to avoid overwhelming the database
    const batchSize = 5
    let totalApplied = 0

    for (let i = 0; i < allIndexes.length; i += batchSize) {
      const batch = allIndexes.slice(i, i + batchSize)
      
      logger.info(`Applying index batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allIndexes.length/batchSize)}`)
      
      for (const indexSql of batch) {
        try {
          await db.execute(sql.raw(indexSql))
          totalApplied++
          logger.debug(`Applied index: ${indexSql.split('idx_')[1]?.split(' ')[0] || 'unknown'}`)
        } catch (error) {
          logger.warn(`Failed to apply index: ${indexSql}`, { 
            error: error instanceof Error ? error.message : String(error) 
          })
          // Continue with other indexes even if one fails
        }
      }

      // Small delay between batches
      if (i + batchSize < allIndexes.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    logger.info(`Database index optimization completed. Applied ${totalApplied}/${allIndexes.length} indexes.`)

    // Analyze tables to update statistics
    logger.info('Analyzing database tables to update statistics...')
    
    const tables = [
      'users', 'patients', 'reminders', 'manual_confirmations', 
      'medical_records', 'conversation_states', 'conversation_messages',
      'cms_articles', 'cms_videos', 'volunteer_notifications'
    ]

    for (const table of tables) {
      try {
        await db.execute(sql.raw(`ANALYZE ${table};`))
        logger.debug(`Analyzed table: ${table}`)
      } catch (error) {
        logger.warn(`Failed to analyze table ${table}:`, { 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }

    logger.info('Database optimization completed successfully!')

  } catch (error) {
    logger.error('Database index optimization failed:', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

// Run the optimization if this file is executed directly
if (import.meta.main) {
  applyIndexes()
    .then(() => {
      logger.info('Index optimization script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Index optimization script failed:', error)
      process.exit(1)
    })
}

export { applyIndexes }
