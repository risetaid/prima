DO $$ BEGIN
 CREATE TYPE "public"."confirmation_status" AS ENUM('PENDING', 'CONFIRMED', 'MISSED', 'UNKNOWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE 'DEVELOPER';--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE 'RELAWAN';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'RELAWAN';--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "confirmation_status" "confirmation_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "confirmation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "confirmation_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "confirmation_message" text;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "confirmation_response" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_status_idx" ON "reminder_logs" USING btree ("confirmation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_confirmation_sent_at_idx" ON "reminder_logs" USING btree ("confirmation_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_patient_confirmation_idx" ON "reminder_logs" USING btree ("patient_id","confirmation_status");