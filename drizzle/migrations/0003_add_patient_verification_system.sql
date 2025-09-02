DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('pending_verification', 'verified', 'declined', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_status" "verification_status" DEFAULT 'pending_verification' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_message" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_attempts" text DEFAULT '0';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verification_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_patient_idx" ON "verification_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_created_at_idx" ON "verification_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_logs_action_idx" ON "verification_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_verification_status_idx" ON "patients" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_verification_status_active_idx" ON "patients" USING btree ("verification_status","is_active");