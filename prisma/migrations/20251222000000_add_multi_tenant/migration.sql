-- =============================================
-- マルチテナント対応マイグレーション
-- =============================================

-- CreateEnum: UserRole
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable: tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: invitations
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_email_key" ON "invitations"("email");
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_tenant_id_idx" ON "invitations"("tenant_id");
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- 既存データの削除（リセット用）
-- =============================================
TRUNCATE TABLE "order_details", "orders", "materials", "categories", "users" CASCADE;

-- =============================================
-- usersテーブルの変更
-- =============================================

DROP INDEX IF EXISTS "users_username_key";
DROP INDEX IF EXISTS "users_username_idx";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
ALTER TABLE "users" DROP COLUMN IF EXISTS "company_name";

ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT NOT NULL;
ALTER TABLE "users" ADD COLUMN "email" TEXT NOT NULL;
ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL;
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "users" ADD COLUMN "invited_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "joined_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_email_idx" ON "users"("email");

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- categoriesテーブルの変更
-- =============================================

DROP INDEX IF EXISTS "categories_name_key";

ALTER TABLE "categories" ADD COLUMN "tenant_id" TEXT NOT NULL;

CREATE UNIQUE INDEX "categories_tenant_id_name_key" ON "categories"("tenant_id", "name");
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- materialsテーブルの変更
-- =============================================

DROP INDEX IF EXISTS "materials_material_code_key";

ALTER TABLE "materials" ADD COLUMN "tenant_id" TEXT NOT NULL;

CREATE UNIQUE INDEX "materials_tenant_id_material_code_key" ON "materials"("tenant_id", "material_code");
CREATE INDEX "materials_tenant_id_idx" ON "materials"("tenant_id");

ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- ordersテーブルの変更
-- =============================================

DROP INDEX IF EXISTS "orders_order_number_key";

ALTER TABLE "orders" ADD COLUMN "tenant_id" TEXT NOT NULL;

CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
