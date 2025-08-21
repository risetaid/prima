/*
  Warnings:

  - You are about to drop the column `schedule_id` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_for` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `days_of_week` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `education_link` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `message_template` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `patient_medication_id` on the `reminder_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `time_of_day` on the `reminder_schedules` table. All the data in the column will be lost.
  - Added the required column `message` to the `reminder_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `reminder_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `sent_at` on table `reminder_logs` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `created_by_id` to the `reminder_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medication_name` to the `reminder_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `reminder_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_time` to the `reminder_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `reminder_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('DAILY', 'WEEKLY');

-- DropForeignKey
ALTER TABLE "public"."reminder_logs" DROP CONSTRAINT "reminder_logs_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminder_schedules" DROP CONSTRAINT "reminder_schedules_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminder_schedules" DROP CONSTRAINT "reminder_schedules_patient_medication_id_fkey";

-- AlterTable
ALTER TABLE "public"."manual_confirmations" ADD COLUMN     "reminder_schedule_id" TEXT;

-- AlterTable
ALTER TABLE "public"."reminder_logs" DROP COLUMN "schedule_id",
DROP COLUMN "scheduled_for",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT NOT NULL,
ADD COLUMN     "reminder_schedule_id" TEXT,
ALTER COLUMN "sent_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."reminder_schedules" DROP COLUMN "created_by",
DROP COLUMN "days_of_week",
DROP COLUMN "education_link",
DROP COLUMN "message_template",
DROP COLUMN "patient_medication_id",
DROP COLUMN "time_of_day",
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "custom_message" TEXT,
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "frequency" "public"."Frequency" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "medication_name" TEXT NOT NULL,
ADD COLUMN     "patientMedicationId" TEXT,
ADD COLUMN     "patient_id" TEXT NOT NULL,
ADD COLUMN     "scheduled_time" TEXT NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."patient_symptoms" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "symptom_text" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_symptoms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_patientMedicationId_fkey" FOREIGN KEY ("patientMedicationId") REFERENCES "public"."patient_medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_logs" ADD CONSTRAINT "reminder_logs_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_symptoms" ADD CONSTRAINT "patient_symptoms_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
