DROP INDEX IF EXISTS "patient_medications_patient_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "patient_medications_medication_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "patient_medications_is_active_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "patient_medications_patient_active_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "patient_medications_start_date_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medications" DROP CONSTRAINT "patient_medications_patient_id_patients_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medications" DROP CONSTRAINT "patient_medications_medication_id_medications_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medications" DROP CONSTRAINT "patient_medications_created_by_users_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
DROP TABLE "patient_medications";