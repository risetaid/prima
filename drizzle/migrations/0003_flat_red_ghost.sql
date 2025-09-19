CREATE TABLE IF NOT EXISTS "message_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"message_type" text DEFAULT 'general' NOT NULL,
	"conversation_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"priority_score" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"last_error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_queue_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_processed" integer DEFAULT 0 NOT NULL,
	"total_failed" integer DEFAULT 0 NOT NULL,
	"average_processing_time" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_status_idx" ON "message_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_priority_idx" ON "message_queue" USING btree ("priority_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_patient_idx" ON "message_queue" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_created_at_idx" ON "message_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_status_priority_idx" ON "message_queue" USING btree ("status","priority_score");