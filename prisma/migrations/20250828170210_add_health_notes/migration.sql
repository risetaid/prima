-- AlterEnum
ALTER TYPE "public"."MedicalRecordType" ADD VALUE 'HEALTH_NOTE';

-- CreateTable
CREATE TABLE "public"."health_notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "note_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_notes_patient_id_idx" ON "public"."health_notes"("patient_id");

-- CreateIndex
CREATE INDEX "health_notes_patient_id_note_date_idx" ON "public"."health_notes"("patient_id", "note_date");

-- CreateIndex
CREATE INDEX "health_notes_recorded_by_idx" ON "public"."health_notes"("recorded_by");

-- AddForeignKey
ALTER TABLE "public"."health_notes" ADD CONSTRAINT "health_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."health_notes" ADD CONSTRAINT "health_notes_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
