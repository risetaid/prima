-- AlterTable
ALTER TABLE "public"."manual_confirmations" ADD COLUMN     "reminder_log_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."manual_confirmations" ADD CONSTRAINT "manual_confirmations_reminder_log_id_fkey" FOREIGN KEY ("reminder_log_id") REFERENCES "public"."reminder_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
