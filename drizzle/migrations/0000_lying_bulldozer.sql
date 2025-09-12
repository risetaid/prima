DO $$ BEGIN
 CREATE TYPE "public"."cancer_stage" AS ENUM('I', 'II', 'III', 'IV');
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
CREATE TABLE IF NOT EXISTS "health_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"note" text NOT NULL,
	"note_date" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
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
	"medications_taken" boolean NOT NULL,
	"medications_missed" text[] DEFAULT '{}' NOT NULL,
	"patient_condition" "patient_condition" NOT NULL,
	"symptoms_reported" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"follow_up_needed" boolean DEFAULT false NOT NULL,
	"follow_up_notes" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"photo_url" text
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
	"fonnte_message_id" text
);
--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
	CONSTRAINT "whatsapp_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_id_idx" ON "health_notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_note_date_idx" ON "health_notes" USING btree ("patient_id","note_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_recorded_by_idx" ON "health_notes" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_id_idx" ON "manual_confirmations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_volunteer_id_idx" ON "manual_confirmations" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_schedule_id_idx" ON "manual_confirmations" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_log_id_idx" ON "manual_confirmations" USING btree ("reminder_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_visit_date_idx" ON "manual_confirmations" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_visit_date_idx" ON "manual_confirmations" USING btree ("patient_id","visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_patient_idx" ON "manual_confirmations" USING btree ("confirmed_at","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_is_active_idx" ON "patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_idx" ON "patients" USING btree ("assigned_volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_active_idx" ON "patients" USING btree ("assigned_volunteer_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_phone_number_idx" ON "patients" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_created_at_idx" ON "patients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_id_idx" ON "reminder_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_reminder_schedule_id_idx" ON "reminder_logs" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_status_idx" ON "reminder_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_idx" ON "reminder_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_status_idx" ON "reminder_logs" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_status_idx" ON "reminder_logs" USING btree ("sent_at","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_id_idx" ON "reminder_schedules" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_is_active_idx" ON "reminder_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_patient_active_idx" ON "reminder_schedules" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_start_date_idx" ON "reminder_schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_end_date_idx" ON "reminder_schedules" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_schedules_created_active_idx" ON "reminder_schedules" USING btree ("created_at","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_approved_idx" ON "users" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_active_approved_idx" ON "users" USING btree ("role","is_active","is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_approved_active_idx" ON "users" USING btree ("clerk_id","is_approved","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_idx" ON "whatsapp_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_is_active_idx" ON "whatsapp_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_active_idx" ON "whatsapp_templates" USING btree ("category","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_created_by_idx" ON "whatsapp_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");