ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" USING btree ("last_login_at");