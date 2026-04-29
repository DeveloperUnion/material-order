-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trucks_tenant_id_idx" ON "trucks"("tenant_id");

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "truck_id" TEXT,
                     ADD COLUMN "truck_name" TEXT,
                     ADD COLUMN "truck_capacity_kg" INTEGER;

-- CreateIndex
CREATE INDEX "orders_truck_id_idx" ON "orders"("truck_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
