-- ===== COMPLETE CONSOLIDATED MIGRATION =====
-- Combines all 13 migration files into one executable schema
-- Generated for PRIMA Medical System - Prototype Edition

DO $$ BEGIN
 CREATE TYPE "public"."cancer_stage" AS ENUM('I', 'II', 'III', 'IV');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."confirmation_status" AS ENUM('PENDING', 'SENT', 'CONFIRMED', 'MISSED', 'UNKNOWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."frequency" AS ENUM('CUSTOM', 'CUSTOM_RECURRENCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."medical_record_type" AS ENUM('DIAGNOSIS', 'TREATMENT', 'PROGRESS', 'HEALTH_NOTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."patient_condition" AS ENUM('GOOD', 'FAIR', 'POOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."reminder_status" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."template_category" AS ENUM('REMINDER', 'APPOINTMENT', 'EDUCATIONAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('DEVELOPER', 'ADMIN', 'RELAWAN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('pending_verification', 'verified', 'declined', 'expired', 'unsubscribed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

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

CREATE TABLE IF NOT EXISTS "manual_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"reminder_schedule_id" uuid,
	"reminder_log_id" uuid,
	"visit_date" timestamp with time zone NOT NULL,
	"visit_time" text NOT NULL,
	"medications_taken" boolean NOT NULL,
	"medications_missed" text[] DEFAULT '{}' NOT NULL,
	"patient_condition" "patient_condition" NOT NULL,
	"symptoms_reported" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"follow_up_needed" boolean DEFAULT false NOT NULL,
	"follow_up_notes" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "patient_medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"instructions" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "patient_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"variable_value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"address" text,
	"birth_date" timestamp with time zone,
	"diagnosis_date" timestamp with time zone,
	"cancer_stage" "cancer_stage",
	"assigned_volunteer_id" uuid,
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
	"last_reactivated_at" timestamp with time zone
);

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

CREATE TABLE IF NOT EXISTS "reminder_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_name" text NOT NULL,
	"dosage" text,
	"doctor_name" text,
	"scheduled_time" text NOT NULL,
	"frequency" "frequency" DEFAULT 'CUSTOM' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"custom_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

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

CREATE TABLE IF NOT EXISTS "verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"action" text NOT NULL,
	"message_sent" text,
	"patient_response" text,
	"verification_result" "verification_status",
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

DO $$ BEGIN
 ALTER TABLE "health_notes" ADD CONSTRAINT "health_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "health_notes" ADD CONSTRAINT "health_notes_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "manual_confirmations" ADD CONSTRAINT "manual_confirmations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "manual_confirmations" ADD CONSTRAINT "manual_confirmations_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_log_id_reminder_logs_id_fk" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patient_variables" ADD CONSTRAINT "patient_variables_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patient_variables" ADD CONSTRAINT "patient_variables_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_volunteer_id_users_id_fk" FOREIGN KEY ("assigned_volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_content_attachments" ADD CONSTRAINT "reminder_content_attachments_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_content_attachments" ADD CONSTRAINT "reminder_content_attachments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "cms_articles_slug_idx" ON "cms_articles" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "cms_articles_status_idx" ON "cms_articles" USING btree ("status");
CREATE INDEX IF NOT EXISTS "cms_articles_category_idx" ON "cms_articles" USING btree ("category");
CREATE INDEX IF NOT EXISTS "cms_articles_published_at_idx" ON "cms_articles" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "cms_articles_status_published_idx" ON "cms_articles" USING btree ("status","published_at");
CREATE INDEX IF NOT EXISTS "cms_articles_category_status_idx" ON "cms_articles" USING btree ("category","status");
CREATE INDEX IF NOT EXISTS "cms_articles_created_by_idx" ON "cms_articles" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "cms_articles_deleted_at_idx" ON "cms_articles" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "cms_articles_status_deleted_idx" ON "cms_articles" USING btree ("status","deleted_at");
CREATE INDEX IF NOT EXISTS "cms_videos_slug_idx" ON "cms_videos" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "cms_videos_status_idx" ON "cms_videos" USING btree ("status");
CREATE INDEX IF NOT EXISTS "cms_videos_category_idx" ON "cms_videos" USING btree ("category");
CREATE INDEX IF NOT EXISTS "cms_videos_published_at_idx" ON "cms_videos" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "cms_videos_status_published_idx" ON "cms_videos" USING btree ("status","published_at");
CREATE INDEX IF NOT EXISTS "cms_videos_category_status_idx" ON "cms_videos" USING btree ("category","status");
CREATE INDEX IF NOT EXISTS "cms_videos_created_by_idx" ON "cms_videos" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "cms_videos_deleted_at_idx" ON "cms_videos" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "cms_videos_status_deleted_idx" ON "cms_videos" USING btree ("status","deleted_at");
CREATE INDEX IF NOT EXISTS "health_notes_patient_id_idx" ON "health_notes" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "health_notes_patient_note_date_idx" ON "health_notes" USING btree ("patient_id","note_date");
CREATE INDEX IF NOT EXISTS "health_notes_recorded_by_idx" ON "health_notes" USING btree ("recorded_by");
CREATE INDEX IF NOT EXISTS "health_notes_deleted_at_idx" ON "health_notes" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_id_idx" ON "manual_confirmations" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "manual_confirmations_volunteer_id_idx" ON "manual_confirmations" USING btree ("volunteer_id");
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_schedule_id_idx" ON "manual_confirmations" USING btree ("reminder_schedule_id");
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_log_id_idx" ON "manual_confirmations" USING btree ("reminder_log_id");
CREATE INDEX IF NOT EXISTS "manual_confirmations_visit_date_idx" ON "manual_confirmations" USING btree ("visit_date");
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_visit_date_idx" ON "manual_confirmations" USING btree ("patient_id","visit_date");
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_patient_idx" ON "manual_confirmations" USING btree ("confirmed_at","patient_id");
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_at_idx" ON "manual_confirmations" USING btree ("confirmed_at");
CREATE INDEX IF NOT EXISTS "manual_confirmations_medications_taken_idx" ON "manual_confirmations" USING btree ("medications_taken");
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_confirmed_at_idx" ON "manual_confirmations" USING btree ("patient_id","confirmed_at");
CREATE INDEX IF NOT EXISTS "medical_records_patient_id_idx" ON "medical_records" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "medical_records_record_type_idx" ON "medical_records" USING btree ("record_type");
CREATE INDEX IF NOT EXISTS "medical_records_recorded_date_idx" ON "medical_records" USING btree ("recorded_date");
CREATE INDEX IF NOT EXISTS "medical_records_recorded_by_idx" ON "medical_records" USING btree ("recorded_by");
CREATE INDEX IF NOT EXISTS "medical_records_patient_recorded_date_idx" ON "medical_records" USING btree ("patient_id","recorded_date");
CREATE INDEX IF NOT EXISTS "patient_medications_patient_id_idx" ON "patient_medications" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "patient_medications_medication_id_idx" ON "patient_medications" USING btree ("medication_id");
CREATE INDEX IF NOT EXISTS "patient_medications_is_active_idx" ON "patient_medications" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "patient_medications_patient_active_idx" ON "patient_medications" USING btree ("patient_id","is_active");
CREATE INDEX IF NOT EXISTS "patient_medications_start_date_idx" ON "patient_medications" USING btree ("start_date");
CREATE INDEX IF NOT EXISTS "patient_variables_patient_idx" ON "patient_variables" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "patient_variables_name_idx" ON "patient_variables" USING btree ("patient_id","variable_name");
CREATE INDEX IF NOT EXISTS "patient_variables_patient_active_idx" ON "patient_variables" USING btree ("patient_id","is_active");
CREATE INDEX IF NOT EXISTS "patient_variables_deleted_at_idx" ON "patient_variables" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "patients_is_active_idx" ON "patients" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_idx" ON "patients" USING btree ("assigned_volunteer_id");
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_active_idx" ON "patients" USING btree ("assigned_volunteer_id","is_active");
CREATE INDEX IF NOT EXISTS "patients_phone_number_idx" ON "patients" USING btree ("phone_number");
CREATE INDEX IF NOT EXISTS "patients_created_at_idx" ON "patients" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "patients_verification_status_idx" ON "patients" USING btree ("verification_status");
CREATE INDEX IF NOT EXISTS "patients_verification_status_active_idx" ON "patients" USING btree ("verification_status","is_active");
CREATE INDEX IF NOT EXISTS "patients_deleted_at_idx" ON "patients" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "patients_deleted_active_idx" ON "patients" USING btree ("deleted_at","is_active");
CREATE INDEX IF NOT EXISTS "patients_deleted_active_name_idx" ON "patients" USING btree ("deleted_at","is_active","name");
CREATE INDEX IF NOT EXISTS "patients_assigned_deleted_active_idx" ON "patients" USING btree ("assigned_volunteer_id","deleted_at","is_active");
CREATE INDEX IF NOT EXISTS "reminder_content_unique_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id","content_type","content_id");
CREATE INDEX IF NOT EXISTS "reminder_content_reminder_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id");
CREATE INDEX IF NOT EXISTS "reminder_content_type_id_idx" ON "reminder_content_attachments" USING btree ("content_type","content_id");
CREATE INDEX IF NOT EXISTS "reminder_content_created_at_idx" ON "reminder_content_attachments" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "reminder_content_created_by_idx" ON "reminder_content_attachments" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_id_idx" ON "reminder_logs" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "reminder_logs_reminder_schedule_id_idx" ON "reminder_logs" USING btree ("reminder_schedule_id");
CREATE INDEX IF NOT EXISTS "reminder_logs_status_idx" ON "reminder_logs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_idx" ON "reminder_logs" USING btree ("sent_at");
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_status_idx" ON "reminder_logs" USING btree ("patient_id","status");
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_status_idx" ON "reminder_logs" USING btree ("sent_at","status");
CREATE INDEX IF NOT EXISTS "reminder_logs_delivered_patient_idx" ON "reminder_logs" USING btree ("status","patient_id");
CREATE INDEX IF NOT EXISTS "reminder_logs_schedule_status_sent_idx" ON "reminder_logs" USING btree ("reminder_schedule_id","status","sent_at");
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_patient_idx" ON "reminder_logs" USING btree ("sent_at","patient_id");
CREATE INDEX IF NOT EXISTS "reminder_logs_status_sent_at_idx" ON "reminder_logs" USING btree ("status","sent_at");
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_status_idx" ON "reminder_logs" USING btree ("confirmation_status");
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_sent_at_idx" ON "reminder_logs" USING btree ("confirmation_sent_at");
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_confirmation_idx" ON "reminder_logs" USING btree ("patient_id","confirmation_status");
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_id_idx" ON "reminder_schedules" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "reminder_schedules_is_active_idx" ON "reminder_schedules" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_active_idx" ON "reminder_schedules" USING btree ("patient_id","is_active");
CREATE INDEX IF NOT EXISTS "reminder_schedules_start_date_idx" ON "reminder_schedules" USING btree ("start_date");
CREATE INDEX IF NOT EXISTS "reminder_schedules_end_date_idx" ON "reminder_schedules" USING btree ("end_date");
CREATE INDEX IF NOT EXISTS "reminder_schedules_created_active_idx" ON "reminder_schedules" USING btree ("created_at","is_active");
CREATE INDEX IF NOT EXISTS "reminder_schedules_deleted_at_idx" ON "reminder_schedules" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "reminder_schedules_active_deleted_start_idx" ON "reminder_schedules" USING btree ("is_active","deleted_at","start_date");
CREATE INDEX IF NOT EXISTS "reminder_schedules_start_active_deleted_idx" ON "reminder_schedules" USING btree ("start_date","is_active","deleted_at");
CREATE INDEX IF NOT EXISTS "reminder_schedules_today_reminders_idx" ON "reminder_schedules" USING btree ("start_date","is_active","deleted_at","scheduled_time");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "users_is_approved_idx" ON "users" USING btree ("is_approved");
CREATE INDEX IF NOT EXISTS "users_role_active_approved_idx" ON "users" USING btree ("role","is_active","is_approved");
CREATE INDEX IF NOT EXISTS "users_clerk_approved_active_idx" ON "users" USING btree ("clerk_id","is_approved","is_active");
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");
CREATE INDEX IF NOT EXISTS "verification_logs_patient_idx" ON "verification_logs" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "verification_logs_created_at_idx" ON "verification_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "verification_logs_action_idx" ON "verification_logs" USING btree ("action");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_idx" ON "whatsapp_templates" USING btree ("category");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_is_active_idx" ON "whatsapp_templates" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_active_idx" ON "whatsapp_templates" USING btree ("category","is_active");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_created_by_idx" ON "whatsapp_templates" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_deleted_at_idx" ON "whatsapp_templates" USING btree ("deleted_at");