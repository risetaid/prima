/*
  Warnings:

  - The values [DAILY,WEEKLY] on the enum `Frequency` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `common_dosages` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `generic_name` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `side_effects` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `prescribed_by` on the `patient_medications` table. All the data in the column will be lost.
  - You are about to drop the column `error_message` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `patient_response` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `response_received_at` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `patientMedicationId` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `content_access_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `educational_articles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_symptoms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_login_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `volunteer_metrics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `whatsapp_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Frequency_new" AS ENUM ('CUSTOM', 'CUSTOM_RECURRENCE');
ALTER TABLE "public"."reminder_schedules" ALTER COLUMN "frequency" DROP DEFAULT;
ALTER TABLE "public"."reminder_schedules" ALTER COLUMN "frequency" TYPE "public"."Frequency_new" USING ("frequency"::text::"public"."Frequency_new");
ALTER TYPE "public"."Frequency" RENAME TO "Frequency_old";
ALTER TYPE "public"."Frequency_new" RENAME TO "Frequency";
DROP TYPE "public"."Frequency_old";
ALTER TABLE "public"."reminder_schedules" ALTER COLUMN "frequency" SET DEFAULT 'CUSTOM';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_access_logs" DROP CONSTRAINT "content_access_logs_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."educational_articles" DROP CONSTRAINT "educational_articles_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."patient_metrics" DROP CONSTRAINT "patient_metrics_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."patient_symptoms" DROP CONSTRAINT "patient_symptoms_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminder_schedules" DROP CONSTRAINT "reminder_schedules_patientMedicationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_login_logs" DROP CONSTRAINT "user_login_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."volunteer_metrics" DROP CONSTRAINT "volunteer_metrics_volunteer_id_fkey";

-- AlterTable
ALTER TABLE "public"."medications" DROP COLUMN "common_dosages",
DROP COLUMN "description",
DROP COLUMN "generic_name",
DROP COLUMN "instructions",
DROP COLUMN "side_effects";

-- AlterTable
ALTER TABLE "public"."patient_medications" DROP COLUMN "prescribed_by";

-- AlterTable
ALTER TABLE "public"."reminder_logs" DROP COLUMN "error_message",
DROP COLUMN "patient_response",
DROP COLUMN "response_received_at";

-- AlterTable
ALTER TABLE "public"."reminder_schedules" DROP COLUMN "patientMedicationId",
ALTER COLUMN "frequency" SET DEFAULT 'CUSTOM';

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "last_login_at",
DROP COLUMN "phone_number";

-- AlterTable
ALTER TABLE "public"."whatsapp_templates" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'REMINDER';

-- DropTable
DROP TABLE "public"."appointments";

-- DropTable
DROP TABLE "public"."content_access_logs";

-- DropTable
DROP TABLE "public"."educational_articles";

-- DropTable
DROP TABLE "public"."patient_metrics";

-- DropTable
DROP TABLE "public"."patient_symptoms";

-- DropTable
DROP TABLE "public"."system_settings";

-- DropTable
DROP TABLE "public"."user_login_logs";

-- DropTable
DROP TABLE "public"."volunteer_metrics";

-- DropEnum
DROP TYPE "public"."AccessSource";

-- DropEnum
DROP TYPE "public"."AppointmentStatus";

-- DropEnum
DROP TYPE "public"."AppointmentType";

-- DropEnum
DROP TYPE "public"."ArticleCategory";

-- CreateIndex
CREATE INDEX "manual_confirmations_confirmed_at_patient_id_idx" ON "public"."manual_confirmations"("confirmed_at", "patient_id");

-- CreateIndex
CREATE INDEX "reminder_logs_sent_at_status_idx" ON "public"."reminder_logs"("sent_at", "status");

-- CreateIndex
CREATE INDEX "reminder_schedules_created_at_is_active_idx" ON "public"."reminder_schedules"("created_at", "is_active");

-- CreateIndex
CREATE INDEX "users_stack_id_is_approved_is_active_idx" ON "public"."users"("stack_id", "is_approved", "is_active");

-- CreateIndex
CREATE INDEX "whatsapp_templates_category_idx" ON "public"."whatsapp_templates"("category");

-- CreateIndex
CREATE INDEX "whatsapp_templates_is_active_idx" ON "public"."whatsapp_templates"("is_active");

-- CreateIndex
CREATE INDEX "whatsapp_templates_category_is_active_idx" ON "public"."whatsapp_templates"("category", "is_active");

-- CreateIndex
CREATE INDEX "whatsapp_templates_created_by_idx" ON "public"."whatsapp_templates"("created_by");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
