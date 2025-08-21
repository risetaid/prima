-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "public"."CancerStage" AS ENUM ('I', 'II', 'III', 'IV');

-- CreateEnum
CREATE TYPE "public"."MedicalRecordType" AS ENUM ('DIAGNOSIS', 'TREATMENT', 'PROGRESS');

-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PatientCondition" AS ENUM ('GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "public"."AppointmentType" AS ENUM ('CHECKUP', 'CHEMOTHERAPY', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AccessSource" AS ENUM ('REMINDER', 'DIRECT', 'SEARCH');

-- CreateEnum
CREATE TYPE "public"."TemplateCategory" AS ENUM ('REMINDER', 'APPOINTMENT', 'EDUCATIONAL');

-- CreateEnum
CREATE TYPE "public"."ArticleCategory" AS ENUM ('MEDICATION', 'NUTRITION', 'EXERCISE', 'MENTAL_HEALTH', 'SYMPTOMS', 'TREATMENT', 'LIFESTYLE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'VOLUNTEER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT,
    "birth_date" TIMESTAMP(3),
    "diagnosis_date" TIMESTAMP(3),
    "cancer_stage" "public"."CancerStage",
    "assigned_volunteer_id" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medical_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "record_type" "public"."MedicalRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recorded_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "description" TEXT,
    "common_dosages" TEXT[],
    "side_effects" TEXT,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "instructions" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "prescribed_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminder_schedules" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_name" TEXT NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "frequency" "public"."Frequency" NOT NULL DEFAULT 'DAILY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "custom_message" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patientMedicationId" TEXT,

    CONSTRAINT "reminder_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminder_logs" (
    "id" TEXT NOT NULL,
    "reminder_schedule_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "twilio_message_id" TEXT,
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "patient_response" TEXT,
    "response_received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_symptoms" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "symptom_text" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manual_confirmations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "reminder_schedule_id" TEXT,
    "reminder_log_id" TEXT,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "visit_time" TEXT NOT NULL,
    "medications_taken" BOOLEAN NOT NULL,
    "medications_missed" TEXT[],
    "patient_condition" "public"."PatientCondition" NOT NULL,
    "symptoms_reported" TEXT[],
    "notes" TEXT,
    "follow_up_needed" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_notes" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_type" "public"."AppointmentType" NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "location" TEXT,
    "doctor_name" TEXT,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "reminders_sent" INTEGER NOT NULL DEFAULT 0,
    "reminders_acknowledged" INTEGER NOT NULL DEFAULT 0,
    "medications_taken" INTEGER NOT NULL DEFAULT 0,
    "medications_missed" INTEGER NOT NULL DEFAULT 0,
    "compliance_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."volunteer_metrics" (
    "id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "patients_managed" INTEGER NOT NULL DEFAULT 0,
    "visits_conducted" INTEGER NOT NULL DEFAULT 0,
    "average_patient_compliance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posts_created" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_access_logs" (
    "id" TEXT NOT NULL,
    "post_slug" TEXT NOT NULL,
    "patient_id" TEXT,
    "accessed_via" "public"."AccessSource" NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_spent" INTEGER,

    CONSTRAINT "content_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_templates" (
    "id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_text" TEXT NOT NULL,
    "variables" TEXT[],
    "category" "public"."TemplateCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_login_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" TEXT,
    "device" TEXT,

    CONSTRAINT "user_login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."educational_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "category" "public"."ArticleCategory" NOT NULL,
    "tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "public"."users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_template_name_key" ON "public"."whatsapp_templates"("template_name");

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_assigned_volunteer_id_fkey" FOREIGN KEY ("assigned_volunteer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medical_records" ADD CONSTRAINT "medical_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_medications" ADD CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_medications" ADD CONSTRAINT "patient_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_medications" ADD CONSTRAINT "patient_medications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_schedules" ADD CONSTRAINT "reminder_schedules_patientMedicationId_fkey" FOREIGN KEY ("patientMedicationId") REFERENCES "public"."patient_medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_logs" ADD CONSTRAINT "reminder_logs_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_logs" ADD CONSTRAINT "reminder_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_symptoms" ADD CONSTRAINT "patient_symptoms_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_log_id_fkey" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_metrics" ADD CONSTRAINT "patient_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_metrics" ADD CONSTRAINT "volunteer_metrics_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_access_logs" ADD CONSTRAINT "content_access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_login_logs" ADD CONSTRAINT "user_login_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."educational_articles" ADD CONSTRAINT "educational_articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
