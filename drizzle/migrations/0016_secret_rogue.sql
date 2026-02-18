DROP TABLE "rate_limits";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_reminder_id_idx" ON "manual_confirmations" USING btree ("reminder_id");