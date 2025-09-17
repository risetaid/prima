DO $$ BEGIN
 CREATE TYPE "public"."followup_status" AS ENUM('PENDING', 'SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'COMPLETED', 'CANCELLED', 'ESCALATED', 'NEEDS_ATTENTION', 'RESPONDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."followup_type" AS ENUM('REMINDER_CONFIRMATION', 'MEDICATION_COMPLIANCE', 'SYMPTOM_CHECK', 'GENERAL_WELLBEING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_category" AS ENUM('CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'HORMONAL_THERAPY', 'PAIN_MANAGEMENT', 'ANTIEMETIC', 'ANTIBIOTIC', 'ANTIVIRAL', 'ANTIFUNGAL', 'SUPPLEMENT', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_form" AS ENUM('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'INFUSION', 'CREAM', 'PATCH', 'INHALER', 'SPRAY', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_frequency" AS ENUM('ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'EVERY_24_HOURS', 'EVERY_WEEK', 'EVERY_MONTH', 'AS_NEEDED', 'CUSTOM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_timing" AS ENUM('BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'BEDTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_unit" AS ENUM('MG', 'G', 'ML', 'MCG', 'IU', 'TABLET', 'CAPSULE', 'DOSE', 'PUFF', 'DROP', 'PATCH', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_administration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_schedule_id" uuid,
	"reminder_schedule_id" uuid,
	"reminder_log_id" uuid,
	"medication_name" text NOT NULL,
	"scheduled_date_time" timestamp with time zone NOT NULL,
	"actual_date_time" timestamp with time zone,
	"dosage" text NOT NULL,
	"dosage_taken" text,
	"status" text NOT NULL,
	"administered_by" text NOT NULL,
	"notes" text,
	"side_effects" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"reminder_schedule_id" uuid,
	"medication_name" text NOT NULL,
	"generic_name" text,
	"category" "medication_category" DEFAULT 'OTHER' NOT NULL,
	"form" "medication_form" DEFAULT 'TABLET' NOT NULL,
	"dosage" text NOT NULL,
	"dosage_value" numeric(10, 3),
	"dosage_unit" "medication_unit" DEFAULT 'MG' NOT NULL,
	"frequency" "medication_frequency" DEFAULT 'ONCE_DAILY' NOT NULL,
	"timing" "medication_timing" DEFAULT 'ANYTIME' NOT NULL,
	"instructions" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"prescribed_by" text,
	"pharmacy" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminder_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_log_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"followup_type" "followup_type" DEFAULT 'REMINDER_CONFIRMATION' NOT NULL,
	"status" "followup_status" DEFAULT 'PENDING' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"message" text NOT NULL,
	"response" text,
	"response_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"queue_job_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_template_id" text NOT NULL,
	"date" text NOT NULL,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"successful_responses" integer DEFAULT 0 NOT NULL,
	"failed_responses" integer DEFAULT 0 NOT NULL,
	"average_response_time" integer,
	"average_tokens_used" integer,
	"total_tokens_used" integer DEFAULT 0 NOT NULL,
	"user_satisfaction" integer,
	"error_rate" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt_template" text,
	"response_format" text DEFAULT 'json' NOT NULL,
	"max_tokens" integer DEFAULT 1000 NOT NULL,
	"temperature" integer DEFAULT 70 NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "llm_prompt_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"conversation_id" text,
	"request" jsonb NOT NULL,
	"response" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"user_feedback" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_test_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" text NOT NULL,
	"name" text NOT NULL,
	"variant" text NOT NULL,
	"prompt_template_id" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"target_audience" jsonb,
	"sample_size" integer,
	"traffic_split" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"patient_id" uuid,
	"session_id" text NOT NULL,
	"event_data" jsonb,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"user_id" uuid NOT NULL,
	"patient_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohort_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_name" text NOT NULL,
	"cohort_date" timestamp with time zone NOT NULL,
	"patient_count" integer NOT NULL,
	"metrics" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"access_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"access_reason" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"metric_name" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"tags" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"threshold" numeric(10, 2),
	"is_alert" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"threshold" numeric(10, 2),
	"critical_threshold" numeric(10, 2),
	"status" text DEFAULT 'healthy' NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_variables" ADD COLUMN "variable_category" text DEFAULT 'PERSONAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_variables" ADD COLUMN "variable_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "reminder_schedules" ADD COLUMN "medication_details" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_administration_logs" ADD CONSTRAINT "medication_administration_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_administration_logs" ADD CONSTRAINT "medication_administration_logs_medication_schedule_id_medication_schedules_id_fk" FOREIGN KEY ("medication_schedule_id") REFERENCES "public"."medication_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_administration_logs" ADD CONSTRAINT "medication_administration_logs_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_administration_logs" ADD CONSTRAINT "medication_administration_logs_reminder_log_id_reminder_logs_id_fk" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_followups" ADD CONSTRAINT "reminder_followups_reminder_log_id_reminder_logs_id_fk" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_followups" ADD CONSTRAINT "reminder_followups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_metrics" ADD CONSTRAINT "llm_prompt_metrics_prompt_template_id_llm_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."llm_prompt_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_templates" ADD CONSTRAINT "llm_prompt_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_test_results" ADD CONSTRAINT "llm_prompt_test_results_test_id_llm_prompt_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."llm_prompt_tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_test_results" ADD CONSTRAINT "llm_prompt_test_results_variant_id_llm_prompt_test_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."llm_prompt_test_variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_test_variants" ADD CONSTRAINT "llm_prompt_test_variants_test_id_llm_prompt_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."llm_prompt_tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_test_variants" ADD CONSTRAINT "llm_prompt_test_variants_prompt_template_id_llm_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."llm_prompt_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_prompt_tests" ADD CONSTRAINT "llm_prompt_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_patient_id_idx" ON "medication_administration_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_medication_schedule_id_idx" ON "medication_administration_logs" USING btree ("medication_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_reminder_schedule_id_idx" ON "medication_administration_logs" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_reminder_log_id_idx" ON "medication_administration_logs" USING btree ("reminder_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_scheduled_date_time_idx" ON "medication_administration_logs" USING btree ("scheduled_date_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_actual_date_time_idx" ON "medication_administration_logs" USING btree ("actual_date_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_status_idx" ON "medication_administration_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_administered_by_idx" ON "medication_administration_logs" USING btree ("administered_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_patient_scheduled_idx" ON "medication_administration_logs" USING btree ("patient_id","scheduled_date_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_patient_status_idx" ON "medication_administration_logs" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_scheduled_status_idx" ON "medication_administration_logs" USING btree ("scheduled_date_time","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_patient_date_status_idx" ON "medication_administration_logs" USING btree ("patient_id","scheduled_date_time","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_admin_logs_created_at_idx" ON "medication_administration_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_patient_id_idx" ON "medication_schedules" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_reminder_schedule_id_idx" ON "medication_schedules" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_category_idx" ON "medication_schedules" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_form_idx" ON "medication_schedules" USING btree ("form");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_frequency_idx" ON "medication_schedules" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_is_active_idx" ON "medication_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_start_date_idx" ON "medication_schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_end_date_idx" ON "medication_schedules" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_patient_active_idx" ON "medication_schedules" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_patient_date_active_idx" ON "medication_schedules" USING btree ("patient_id","start_date","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_deleted_at_idx" ON "medication_schedules" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_active_start_date_idx" ON "medication_schedules" USING btree ("is_active","start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_patient_category_idx" ON "medication_schedules" USING btree ("patient_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_schedules_patient_frequency_idx" ON "medication_schedules" USING btree ("patient_id","frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_reminder_log_id_idx" ON "reminder_followups" USING btree ("reminder_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_patient_id_idx" ON "reminder_followups" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_status_idx" ON "reminder_followups" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_followup_type_idx" ON "reminder_followups" USING btree ("followup_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_scheduled_at_idx" ON "reminder_followups" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_patient_status_idx" ON "reminder_followups" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_scheduled_status_idx" ON "reminder_followups" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_pending_scheduled_idx" ON "reminder_followups" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_retry_count_idx" ON "reminder_followups" USING btree ("retry_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_sent_at_idx" ON "reminder_followups" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_delivered_at_idx" ON "reminder_followups" USING btree ("delivered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_followups_patient_type_status_idx" ON "reminder_followups" USING btree ("patient_id","followup_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_event_name_idx" ON "analytics_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_patient_id_idx" ON "analytics_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_session_id_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_timestamp_idx" ON "analytics_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_type_timestamp_idx" ON "analytics_events" USING btree ("event_type","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_user_session_idx" ON "analytics_events" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_patient_id_idx" ON "audit_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_action_idx" ON "audit_logs" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_action_idx" ON "audit_logs" USING btree ("resource_type","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_timestamp_idx" ON "audit_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_patient_action_idx" ON "audit_logs" USING btree ("patient_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_cohort_name_idx" ON "cohort_analysis" USING btree ("cohort_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_cohort_date_idx" ON "cohort_analysis" USING btree ("cohort_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_is_active_idx" ON "cohort_analysis" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_created_at_idx" ON "cohort_analysis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_name_active_idx" ON "cohort_analysis" USING btree ("cohort_name","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_analysis_date_active_idx" ON "cohort_analysis" USING btree ("cohort_date","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_user_id_idx" ON "data_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_patient_id_idx" ON "data_access_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_access_type_idx" ON "data_access_logs" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_resource_type_idx" ON "data_access_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_timestamp_idx" ON "data_access_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_user_patient_idx" ON "data_access_logs" USING btree ("user_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_patient_timestamp_idx" ON "data_access_logs" USING btree ("patient_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_user_timestamp_idx" ON "data_access_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_access_logs_access_type_timestamp_idx" ON "data_access_logs" USING btree ("access_type","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_metric_type_idx" ON "performance_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_metric_name_idx" ON "performance_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_timestamp_idx" ON "performance_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_is_alert_idx" ON "performance_metrics" USING btree ("is_alert");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_type_timestamp_idx" ON "performance_metrics" USING btree ("metric_type","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_alert_timestamp_idx" ON "performance_metrics" USING btree ("is_alert","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_health_metrics_metric_name_idx" ON "system_health_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_health_metrics_status_idx" ON "system_health_metrics" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_health_metrics_timestamp_idx" ON "system_health_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_health_metrics_name_timestamp_idx" ON "system_health_metrics" USING btree ("metric_name","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_health_metrics_status_timestamp_idx" ON "system_health_metrics" USING btree ("status","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_category_idx" ON "patient_variables" USING btree ("variable_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_category_idx" ON "patient_variables" USING btree ("patient_id","variable_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_category_active_idx" ON "patient_variables" USING btree ("patient_id","variable_category","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_name_category_idx" ON "patient_variables" USING btree ("variable_name","variable_category");