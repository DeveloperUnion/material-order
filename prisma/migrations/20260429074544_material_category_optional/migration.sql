-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_category_id_fkey";

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "category_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
