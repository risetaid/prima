DO $$ BEGIN
 CREATE TYPE "public"."cancer_stage" AS ENUM('I', 'II', 'III', 'IV');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."confirmation_status" AS ENUM('PENDING', 'CONFIRMED', 'MISSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('GENERAL', 'NUTRITION', 'EXERCISE', 'MOTIVATIONAL', 'MEDICAL', 'FAQ');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
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
 CREATE TYPE "public"."reminder_type" AS ENUM('MEDICATION', 'APPOINTMENT', 'GENERAL');
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
 CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'RELAWAN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'VERIFIED', 'DECLINED', 'EXPIRED');
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
	"verification_status" "verification_status" DEFAULT 'PENDING' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "manual_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"reminder_id" uuid,
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
CREATE TABLE IF NOT EXISTS "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"reminder_type" "reminder_type" DEFAULT 'MEDICATION' NOT NULL,
	"scheduled_time" text NOT NULL,
	"message" text NOT NULL,
	"medication_details" jsonb,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"status" "reminder_status" DEFAULT 'PENDING' NOT NULL,
	"fonnte_message_id" text,
	"confirmation_status" "confirmation_status" DEFAULT 'PENDING',
	"confirmation_sent_at" timestamp with time zone,
	"confirmation_response_at" timestamp with time zone,
	"confirmation_response" text
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
	"category" "content_category" DEFAULT 'GENERAL' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
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
	"category" "content_category" DEFAULT 'MOTIVATIONAL' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cms_videos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_approved_idx" ON "users" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_id_idx" ON "health_notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_patient_note_date_idx" ON "health_notes" USING btree ("patient_id","note_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_recorded_by_idx" ON "health_notes" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_notes_deleted_at_idx" ON "health_notes" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_patient_id_idx" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_record_type_idx" ON "medical_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_recorded_date_idx" ON "medical_records" USING btree ("recorded_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_records_recorded_by_idx" ON "medical_records" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_is_active_idx" ON "patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_assigned_volunteer_idx" ON "patients" USING btree ("assigned_volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_phone_number_idx" ON "patients" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_created_at_idx" ON "patients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_verification_status_idx" ON "patients" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_deleted_at_idx" ON "patients" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_id_idx" ON "manual_confirmations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_volunteer_id_idx" ON "manual_confirmations" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_id_idx" ON "manual_confirmations" USING btree ("reminder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_visit_date_idx" ON "manual_confirmations" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_at_idx" ON "manual_confirmations" USING btree ("confirmed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_patient_id_idx" ON "reminders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_is_active_idx" ON "reminders" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_status_idx" ON "reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_type_idx" ON "reminders" USING btree ("reminder_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_start_date_idx" ON "reminders" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_sent_at_idx" ON "reminders" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_confirmation_status_idx" ON "reminders" USING btree ("confirmation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_deleted_at_idx" ON "reminders" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_patient_active_idx" ON "reminders" USING btree ("patient_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_patient_status_idx" ON "reminders" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_today_idx" ON "reminders" USING btree ("start_date","is_active","scheduled_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_idx" ON "whatsapp_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_is_active_idx" ON "whatsapp_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_created_by_idx" ON "whatsapp_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_deleted_at_idx" ON "whatsapp_templates" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_slug_idx" ON "cms_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_status_idx" ON "cms_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_category_idx" ON "cms_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_published_at_idx" ON "cms_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_created_by_idx" ON "cms_articles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_articles_deleted_at_idx" ON "cms_articles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_slug_idx" ON "cms_videos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_status_idx" ON "cms_videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_category_idx" ON "cms_videos" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_published_at_idx" ON "cms_videos" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_created_by_idx" ON "cms_videos" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_videos_deleted_at_idx" ON "cms_videos" USING btree ("deleted_at");