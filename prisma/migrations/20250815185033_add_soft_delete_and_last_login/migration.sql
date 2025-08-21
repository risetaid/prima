-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "last_login_at" TIMESTAMP(3);
