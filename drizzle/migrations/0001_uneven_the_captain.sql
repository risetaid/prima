CREATE TABLE IF NOT EXISTS "patient_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"variable_value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_idx" ON "patient_variables" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_name_idx" ON "patient_variables" USING btree ("patient_id","variable_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_variables_patient_active_idx" ON "patient_variables" USING btree ("patient_id","is_active");