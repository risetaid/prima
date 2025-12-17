/**
 * Fix Schema Drift
 *
 * Applies remaining schema reconciliation changes that Drizzle detected
 * but couldn't apply automatically.
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

async function fixSchemaDrift() {
  logger.info('🔧 Applying schema drift fixes...');

  try {
    // Add missing foreign key constraints (these are idempotent - will skip if exists)
    const constraints = [
      {
        name: 'conversation_messages_conversation_state_id_conversation_states_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE conversation_messages
            ADD CONSTRAINT conversation_messages_conversation_state_id_conversation_states_id_fk
            FOREIGN KEY (conversation_state_id)
            REFERENCES public.conversation_states(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'volunteer_notifications_assigned_volunteer_id_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE volunteer_notifications
            ADD CONSTRAINT volunteer_notifications_assigned_volunteer_id_users_id_fk
            FOREIGN KEY (assigned_volunteer_id)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'manual_confirmations_patient_id_patients_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE manual_confirmations
            ADD CONSTRAINT manual_confirmations_patient_id_patients_id_fk
            FOREIGN KEY (patient_id)
            REFERENCES public.patients(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'manual_confirmations_volunteer_id_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE manual_confirmations
            ADD CONSTRAINT manual_confirmations_volunteer_id_users_id_fk
            FOREIGN KEY (volunteer_id)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'manual_confirmations_reminder_id_reminders_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE manual_confirmations
            ADD CONSTRAINT manual_confirmations_reminder_id_reminders_id_fk
            FOREIGN KEY (reminder_id)
            REFERENCES public.reminders(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'whatsapp_templates_created_by_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE whatsapp_templates
            ADD CONSTRAINT whatsapp_templates_created_by_users_id_fk
            FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'medical_records_recorded_by_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE medical_records
            ADD CONSTRAINT medical_records_recorded_by_users_id_fk
            FOREIGN KEY (recorded_by)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'reminders_created_by_id_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE reminders
            ADD CONSTRAINT reminders_created_by_id_users_id_fk
            FOREIGN KEY (created_by_id)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      },
      {
        name: 'patients_assigned_volunteer_id_users_id_fk',
        query: sql`
          DO $$ BEGIN
            ALTER TABLE patients
            ADD CONSTRAINT patients_assigned_volunteer_id_users_id_fk
            FOREIGN KEY (assigned_volunteer_id)
            REFERENCES public.users(id)
            ON DELETE no action ON UPDATE no action;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `
      }
    ];

    for (const constraint of constraints) {
      try {
        await db.execute(constraint.query);
        logger.info(`✅ Applied constraint: ${constraint.name}`);
      } catch (error) {
        logger.warn(`⚠️  Constraint ${constraint.name} may already exist or failed:`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('✅ Schema drift fixes applied successfully');

  } catch (error) {
    logger.error('❌ Schema drift fix failed:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  fixSchemaDrift()
    .then(() => {
      logger.info('✅ Schema drift fix completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Schema drift fix failed:', error);
      process.exit(1);
    });
}

export { fixSchemaDrift };
