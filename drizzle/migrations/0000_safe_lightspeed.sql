DO $$ BEGIN
 CREATE TYPE "public"."cancer_stage" AS ENUM('I', 'II', 'III', 'IV');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."confirmation_status" AS ENUM('PENDING', 'SENT', 'CONFIRMED', 'MISSED', 'UNKNOWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
 CREATE TYPE "public"."frequency" AS ENUM('CUSTOM', 'CUSTOM_RECURRENCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medical_record_type" AS ENUM('DIAGNOSIS', 'TREATMENT', 'PROGRESS', 'HEALTH_NOTE');
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
DO $$ BEGIN
 CREATE TYPE "public"."patient_condition" AS ENUM('GOOD', 'FAIR', 'POOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reminder_status" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."template_category" AS ENUM('REMINDER', 'APPOINTMENT', 'EDUCATIONAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('DEVELOPER', 'ADMIN', 'RELAWAN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('pending_verification', 'verified', 'declined', 'expired', 'unsubscribed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"hospital_name" text,
	"role" "user_role" DEFAULT 'RELAWAN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"is_approved" boolean DEFAULT false NOT NULL,
	"clerk_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_state_id" uuid NOT NULL,
	"message" text NOT NULL,
	"direction" text NOT NULL,
	"message_type" text NOT NULL,
	"intent" text,
	"confidence" integer,
	"processed_at" timestamp with time zone,
	"llm_response_id" text,
	"llm_model" text,
	"llm_tokens_used" integer,
	"llm_cost" numeric(10, 6),
	"llm_response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"current_context" text NOT NULL,
	"expected_response_type" text,
	"related_entity_id" uuid,
	"related_entity_type" text,
	"state_data" jsonb,
	"last_message" text,
	"last_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"note" text NOT NULL,
	"note_date" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_response_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_hash" text NOT NULL,
	"patient_context_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"record_type" "medical_record_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"recorded_date" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"variable_value" text NOT NULL,
	"variable_category" text DEFAULT 'PERSONAL' NOT NULL,
	"variable_metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"address" text,
	"birth_date" timestamp with time zone,
	"diagnosis_date" timestamp with time zone,
	"cancer_stage" "cancer_stage",
	"assigned_volunteer_id" uuid,
	"doctor_name" text,
	"hospital_name" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"photo_url" text,
	"verification_status" "verification_status" DEFAULT 'pending_verification' NOT NULL,
	"verification_sent_at" timestamp with time zone,
	"verification_response_at" timestamp with time zone,
	"verification_message" text,
	"verification_attempts" text DEFAULT '0',
	"verification_expires_at" timestamp with time zone,
	"last_reactivated_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_reason" text,
	"unsubscribe_method" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"action" text NOT NULL,
	"message_sent" text,
	"patient_response" text,
	"verification_result" "verification_status",
	"processed_by" uuid,
	"additional_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_volunteer_id" uuid,
	"escalation_reason" text NOT NULL,
	"confidence" integer,
	"intent" text,
	"patient_context" jsonb,
	"responded_at" timestamp with time zone,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manual_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"reminder_schedule_id" uuid,
	"reminder_log_id" uuid,
	"visit_date" timestamp with time zone NOT NULL,
	"visit_time" text NOT NULL,
	"patient_condition" "patient_condition" NOT NULL,
	"symptoms_reported" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"follow_up_needed" boolean DEFAULT false NOT NULL,
	"follow_up_notes" text,
	"medications_taken" text[] DEFAULT '{}',
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE IF NOT EXISTS "reminder_content_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_schedule_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_id" uuid NOT NULL,
	"content_title" text NOT NULL,
	"content_url" text NOT NULL,
	"attachment_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
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
CREATE TABLE IF NOT EXISTS "reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_schedule_id" uuid,
	"patient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"phone_number" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"status" "reminder_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fonnte_message_id" text,
	"confirmation_status" "confirmation_status" DEFAULT 'PENDING',
	"confirmation_sent_at" timestamp with time zone,
	"confirmation_response_at" timestamp with time zone,
	"confirmation_message" text,
	"confirmation_response" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminder_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"scheduled_time" text NOT NULL,
	"frequency" "frequency" DEFAULT 'CUSTOM' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"custom_message" text,
	"medication_details" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" text NOT NULL,
	"template_text" text NOT NULL,
	"variables" text[] DEFAULT '{}' NOT NULL,
	"category" "template_category" DEFAULT 'REMINDER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "whatsapp_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"featured_image_url" text,
	"category" "content_category" DEFAULT 'general' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cms_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration_minutes" text,
	"category" "content_category" DEFAULT 'motivational' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cms_videos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_prompt_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_template_id" uuid NOT NULL,
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
	"test_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
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
	"test_id" uuid NOT NULL,
	"name" text NOT NULL,
	"variant" text NOT NULL,
	"prompt_template_id" uuid NOT NULL,
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
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_state_id_conversation_states_id_fk" FOREIGN KEY ("conversation_state_id") REFERENCES "public"."conversation_states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_states" ADD CONSTRAINT "conversation_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_notes" ADD CONSTRAINT "health_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_variables" ADD CONSTRAINT "patient_variables_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "volunteer_notifications" ADD CONSTRAINT "volunteer_notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
 ALTER TABLE "reminder_content_attachments" ADD CONSTRAINT "reminder_content_attachments_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_approved_idx" ON "users" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_active_approved_idx" ON "users" USING btree ("role","is_active","is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_approved_active_idx" ON "users" USING btree ("clerk_id","is_approved","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_state_id_idx" ON "conversation_messages" USING btree ("conversation_state_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_direction_idx" ON "conversation_messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_message_type_idx" ON "conversation_messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_direction_idx" ON "conversation_messages" USING btree ("conversation_state_id","direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_type_created_idx" ON "conversation_messages" USING btree ("message_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_id_idx" ON "conversation_states" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_phone_number_idx" ON "conversation_states" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_current_context_idx" ON "conversation_states" USING btree ("current_context");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_is_active_idx" ON "conversation_states" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_expires_at_idx" ON "conversation_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_active_idx" ON "conversation_states" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_context_active_idx" ON "conversation_states" USING btree ("current_context","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_deleted_at_idx" ON "conversation_states" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_states_patient_context_active_idx" ON "conversation_states" USING btree ("patient_id","current_context","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_id_idx" ON "health_notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_note_date_idx" ON "health_notes" USING btree ("patient_id","note_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_recorded_by_idx" ON "health_notes" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_deleted_at_idx" ON "health_notes" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_hash_idx" ON "llm_response_cache" USING btree ("message_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_patient_context_hash_idx" ON "llm_response_cache" USING btree ("patient_context_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_expires_at_idx" ON "llm_response_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_response_cache_message_patient_unique_idx" ON "llm_response_cache" USING btree ("message_hash","patient_context_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_patient_id_idx" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_record_type_idx" ON "medical_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_recorded_date_idx" ON "medical_records" USING btree ("recorded_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_recorded_by_idx" ON "medical_records" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_patient_recorded_date_idx" ON "medical_records" USING btree ("patient_id","recorded_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_idx" ON "patient_variables" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_name_idx" ON "patient_variables" USING btree ("patient_id","variable_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_active_idx" ON "patient_variables" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_deleted_at_idx" ON "patient_variables" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_category_idx" ON "patient_variables" USING btree ("variable_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_category_idx" ON "patient_variables" USING btree ("patient_id","variable_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_category_active_idx" ON "patient_variables" USING btree ("patient_id","variable_category","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_name_category_idx" ON "patient_variables" USING btree ("variable_name","variable_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_is_active_idx" ON "patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_idx" ON "patients" USING btree ("assigned_volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_active_idx" ON "patients" USING btree ("assigned_volunteer_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_phone_number_idx" ON "patients" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_created_at_idx" ON "patients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_verification_status_idx" ON "patients" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_verification_status_active_idx" ON "patients" USING btree ("verification_status","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_deleted_at_idx" ON "patients" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_deleted_active_idx" ON "patients" USING btree ("deleted_at","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_deleted_active_name_idx" ON "patients" USING btree ("deleted_at","is_active","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_deleted_active_idx" ON "patients" USING btree ("assigned_volunteer_id","deleted_at","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_patient_idx" ON "verification_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_created_at_idx" ON "verification_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_action_idx" ON "verification_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_id_idx" ON "volunteer_notifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_priority_idx" ON "volunteer_notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_status_idx" ON "volunteer_notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_assigned_volunteer_idx" ON "volunteer_notifications" USING btree ("assigned_volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_escalation_reason_idx" ON "volunteer_notifications" USING btree ("escalation_reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_created_at_idx" ON "volunteer_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_status_priority_idx" ON "volunteer_notifications" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_assigned_status_idx" ON "volunteer_notifications" USING btree ("assigned_volunteer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_notifications_patient_status_idx" ON "volunteer_notifications" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_id_idx" ON "manual_confirmations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_volunteer_id_idx" ON "manual_confirmations" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_schedule_id_idx" ON "manual_confirmations" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_log_id_idx" ON "manual_confirmations" USING btree ("reminder_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_visit_date_idx" ON "manual_confirmations" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_visit_date_idx" ON "manual_confirmations" USING btree ("patient_id","visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_patient_idx" ON "manual_confirmations" USING btree ("confirmed_at","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_at_idx" ON "manual_confirmations" USING btree ("confirmed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_confirmed_at_idx" ON "manual_confirmations" USING btree ("patient_id","confirmed_at");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "reminder_content_unique_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id","content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_reminder_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_type_id_idx" ON "reminder_content_attachments" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_created_at_idx" ON "reminder_content_attachments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_created_by_idx" ON "reminder_content_attachments" USING btree ("created_by");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_id_idx" ON "reminder_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_reminder_schedule_id_idx" ON "reminder_logs" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_status_idx" ON "reminder_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_idx" ON "reminder_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_status_idx" ON "reminder_logs" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_status_idx" ON "reminder_logs" USING btree ("sent_at","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_delivered_patient_idx" ON "reminder_logs" USING btree ("status","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_schedule_status_sent_idx" ON "reminder_logs" USING btree ("reminder_schedule_id","status","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_patient_idx" ON "reminder_logs" USING btree ("sent_at","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_status_sent_at_idx" ON "reminder_logs" USING btree ("status","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_status_idx" ON "reminder_logs" USING btree ("confirmation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_sent_at_idx" ON "reminder_logs" USING btree ("confirmation_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_id_idx" ON "reminder_schedules" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_is_active_idx" ON "reminder_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_active_idx" ON "reminder_schedules" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_start_date_idx" ON "reminder_schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_end_date_idx" ON "reminder_schedules" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_created_active_idx" ON "reminder_schedules" USING btree ("created_at","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_deleted_at_idx" ON "reminder_schedules" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_active_deleted_start_idx" ON "reminder_schedules" USING btree ("is_active","deleted_at","start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_start_active_deleted_idx" ON "reminder_schedules" USING btree ("start_date","is_active","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_today_reminders_idx" ON "reminder_schedules" USING btree ("start_date","is_active","deleted_at","scheduled_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_idx" ON "whatsapp_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_is_active_idx" ON "whatsapp_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_active_idx" ON "whatsapp_templates" USING btree ("category","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_created_by_idx" ON "whatsapp_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_deleted_at_idx" ON "whatsapp_templates" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_slug_idx" ON "cms_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_idx" ON "cms_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_category_idx" ON "cms_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_published_at_idx" ON "cms_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_published_idx" ON "cms_articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_category_status_idx" ON "cms_articles" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_created_by_idx" ON "cms_articles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_deleted_at_idx" ON "cms_articles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_deleted_idx" ON "cms_articles" USING btree ("status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_slug_idx" ON "cms_videos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_idx" ON "cms_videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_category_idx" ON "cms_videos" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_published_at_idx" ON "cms_videos" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_published_idx" ON "cms_videos" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_category_status_idx" ON "cms_videos" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_created_by_idx" ON "cms_videos" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_deleted_at_idx" ON "cms_videos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_deleted_idx" ON "cms_videos" USING btree ("status","deleted_at");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "system_health_metrics_status_timestamp_idx" ON "system_health_metrics" USING btree ("status","timestamp");