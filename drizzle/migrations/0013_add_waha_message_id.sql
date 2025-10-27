-- Add waha_message_id column to reminders table
-- This column tracks message IDs from WAHA (WhatsApp HTTP API)

ALTER TABLE reminders ADD COLUMN waha_message_id text;

-- Create index for faster lookups
CREATE INDEX reminders_waha_message_id_idx ON reminders(waha_message_id);
