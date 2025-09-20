-- Phase 1 Migration: Create reminder_logs table
-- This table tracks all reminder actions and responses for comprehensive auditing

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- SENT, DELIVERED, FAILED, CONFIRMED, MISSED, FOLLOWUP_SENT
    action_type TEXT, -- INITIAL, FOLLOWUP, MANUAL, AUTOMATIC
    message TEXT,
    response TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS reminder_logs_reminder_id_idx ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS reminder_logs_patient_id_idx ON reminder_logs(patient_id);
CREATE INDEX IF NOT EXISTS reminder_logs_action_idx ON reminder_logs(action);
CREATE INDEX IF NOT EXISTS reminder_logs_timestamp_idx ON reminder_logs(timestamp);
CREATE INDEX IF NOT EXISTS reminder_logs_reminder_action_idx ON reminder_logs(reminder_id, action);
CREATE INDEX IF NOT EXISTS reminder_logs_patient_timestamp_idx ON reminder_logs(patient_id, timestamp);

-- Add constraints
ALTER TABLE reminder_logs ADD CONSTRAINT reminder_logs_action_check
CHECK (action IN ('SENT', 'DELIVERED', 'FAILED', 'CONFIRMED', 'MISSED', 'FOLLOWUP_SENT', 'RESPONSE_RECEIVED'));

ALTER TABLE reminder_logs ADD CONSTRAINT reminder_logs_action_type_check
CHECK (action_type IN ('INITIAL', 'FOLLOWUP', 'MANUAL', 'AUTOMATIC'));

-- Add comments for documentation
COMMENT ON TABLE reminder_logs IS 'Tracks all reminder actions and responses for comprehensive auditing';
COMMENT ON COLUMN reminder_logs.action IS 'Type of action performed';
COMMENT ON COLUMN reminder_logs.action_type IS 'How the action was triggered';
COMMENT ON COLUMN reminder_logs.metadata IS 'Additional data about the action';

-- Create function to migrate existing reminder data to logs
CREATE OR REPLACE FUNCTION migrate_existing_reminders_to_logs()
RETURNS VOID AS $$
DECLARE
    reminder_record RECORD;
BEGIN
    -- Migrate sent reminders
    FOR reminder_record IN SELECT * FROM reminders WHERE sent_at IS NOT NULL
    LOOP
        INSERT INTO reminder_logs (
            reminder_id, patient_id, action, action_type, message, timestamp, metadata
        ) VALUES (
            reminder_record.id,
            reminder_record.patient_id,
            'SENT',
            'INITIAL',
            reminder_record.message,
            reminder_record.sent_at,
            jsonb_build_object(
                'status', reminder_record.status,
                'fonnte_message_id', reminder_record.fonnte_message_id
            )
        );
    END LOOP;

    -- Migrate confirmed reminders
    FOR reminder_record IN SELECT * FROM reminders WHERE confirmation_status = 'CONFIRMED'
    LOOP
        INSERT INTO reminder_logs (
            reminder_id, patient_id, action, action_type, response, timestamp, metadata
        ) VALUES (
            reminder_record.id,
            reminder_record.patient_id,
            'CONFIRMED',
            'MANUAL',
            reminder_record.confirmation_response,
            COALESCE(reminder_record.confirmation_response_at, reminder_record.confirmed_at),
            jsonb_build_object(
                'confirmation_sent_at', reminder_record.confirmation_sent_at,
                'confirmation_type', 'PATIENT_RESPONSE'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute migration function (commented out for safety - run manually)
-- SELECT migrate_existing_reminders_to_logs();