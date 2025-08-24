/*
  Warnings:

  - A unique constraint covering the columns `[stack_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stack_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."users_clerk_id_key";

-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "photo_url" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "stack_id" TEXT NOT NULL,
ALTER COLUMN "clerk_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_stack_id_key" ON "public"."users"("stack_id");
