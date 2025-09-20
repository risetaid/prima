CREATE TABLE IF NOT EXISTS "distributed_locks" (
	"lock_key" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_limit_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distributed_locks_expires_at_idx" ON "distributed_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distributed_locks_created_at_idx" ON "distributed_locks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_rate_limit_key_idx" ON "rate_limits" USING btree ("rate_limit_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_created_at_idx" ON "rate_limits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_key_created_at_idx" ON "rate_limits" USING btree ("rate_limit_key","created_at");