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
DO $$ BEGIN
 ALTER TABLE "reminder_content_attachments" ADD CONSTRAINT "reminder_content_attachments_reminder_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_content_attachments" ADD CONSTRAINT "reminder_content_attachments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_unique_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id","content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_reminder_idx" ON "reminder_content_attachments" USING btree ("reminder_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_type_id_idx" ON "reminder_content_attachments" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_created_at_idx" ON "reminder_content_attachments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_content_created_by_idx" ON "reminder_content_attachments" USING btree ("created_by");