-- Rollback Migration 003: Drop reminder_logs table
-- This rollback removes the reminder_logs table entirely

-- WARNING: This will permanently delete all reminder log data

-- Drop the table
DROP TABLE IF EXISTS reminder_logs;

-- Drop the migration function
DROP FUNCTION IF EXISTS migrate_existing_reminders_to_logs;