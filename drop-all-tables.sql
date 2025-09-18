-- Drop all existing tables to start fresh with clean schema
-- WARNING: This will delete all data!

DROP TABLE IF EXISTS __drizzle_migrations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS cms_articles CASCADE;
DROP TABLE IF EXISTS cms_videos CASCADE;
DROP TABLE IF EXISTS health_notes CASCADE;
DROP TABLE IF EXISTS manual_confirmations CASCADE;
DROP TABLE IF EXISTS patient_variables CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS reminder_content_attachments CASCADE;
DROP TABLE IF EXISTS reminder_logs CASCADE;
DROP TABLE IF EXISTS reminder_schedules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS verification_logs CASCADE;

-- Drop any other tables that might exist from previous experiments
DROP TABLE IF EXISTS conversation_states CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS medication_administration_logs CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS reminder_followups CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS llm_prompt_templates CASCADE;
DROP TABLE IF EXISTS llm_prompt_tests CASCADE;
DROP TABLE IF EXISTS llm_prompt_test_variants CASCADE;
DROP TABLE IF EXISTS llm_prompt_test_results CASCADE;
DROP TABLE IF EXISTS llm_prompt_metrics CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS cohort_analysis CASCADE;
DROP TABLE IF EXISTS data_access_logs CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS system_health_metrics CASCADE;
DROP TABLE IF EXISTS volunteer_notifications CASCADE;
DROP TABLE IF EXISTS llm_response_cache CASCADE;