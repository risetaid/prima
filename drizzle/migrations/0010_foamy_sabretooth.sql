ALTER TABLE "patients" ADD COLUMN "last_reactivated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_confirmed_at_idx" ON "manual_confirmations" USING btree ("confirmed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_medications_taken_idx" ON "manual_confirmations" USING btree ("medications_taken");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_confirmations_patient_confirmed_at_idx" ON "manual_confirmations" USING btree ("patient_id","confirmed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_sent_at_patient_idx" ON "reminder_logs" USING btree ("sent_at","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_logs_status_sent_at_idx" ON "reminder_logs" USING btree ("status","sent_at");