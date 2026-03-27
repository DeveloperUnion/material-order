/*
  Warnings:

  - You are about to drop the column `notes` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `materials` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "public"."materials" DROP COLUMN "notes",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
