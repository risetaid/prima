/*
  Warnings:

  - You are about to drop the column `twilio_message_id` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `clerk_id` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."Frequency" ADD VALUE 'CUSTOM_RECURRENCE';

-- AlterTable
ALTER TABLE "public"."reminder_logs" DROP COLUMN "twilio_message_id";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "clerk_id";
