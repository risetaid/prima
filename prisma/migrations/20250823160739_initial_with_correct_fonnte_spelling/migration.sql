/*
  Warnings:

  - You are about to drop the column `fontte_message_id` on the `reminder_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."reminder_logs" DROP COLUMN "fontte_message_id",
ADD COLUMN     "fonnte_message_id" TEXT;
