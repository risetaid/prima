-- Remove poll system from the database

-- Drop all poll_responses indexes
DROP INDEX IF EXISTS "poll_responses_patient_id_idx";
DROP INDEX IF EXISTS "poll_responses_reminder_log_id_idx";
DROP INDEX IF EXISTS "poll_responses_poll_type_idx";
DROP INDEX IF EXISTS "poll_responses_response_time_idx";
DROP INDEX IF EXISTS "poll_responses_phone_number_idx";

-- Drop the poll_responses table
DROP TABLE IF EXISTS "poll_responses";