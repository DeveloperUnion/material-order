-- 注: 適用前に既存データの (tenant_id, name) 重複が無いことを確認:
--   SELECT tenant_id, name, COUNT(*) FROM users GROUP BY 1,2 HAVING COUNT(*) > 1;
-- 既存テナントの code は migration 後に手動で埋める必要あり（最後のセクション参照）。

-- CreateEnum
CREATE TYPE "TenantAuthMode" AS ENUM ('EMAIL', 'NAME');

-- AlterTable: Tenant に authMode 追加（既存テナントは EMAIL がデフォルト）
ALTER TABLE "tenants" ADD COLUMN "auth_mode" "TenantAuthMode" NOT NULL DEFAULT 'EMAIL';

-- AlterTable: Tenant に code 追加（ログイン用の短い会社コード）
-- 既存テナントには UUID の頭 8 文字を仮埋め。後で super_admin が編集する想定。
ALTER TABLE "tenants" ADD COLUMN "code" TEXT;
UPDATE "tenants" SET "code" = SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 8) WHERE "code" IS NULL;
ALTER TABLE "tenants" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- AlterTable: User の email を nullable 化
-- Postgres は nullable @unique で複数 NULL を許容するため、既存の email_key は維持できる
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable: User に passwordSetupExpiresAt 追加（NAME モードの初回 PW 設定期限）
ALTER TABLE "users" ADD COLUMN "password_setup_expires_at" TIMESTAMP(3);

-- CreateIndex: テナント内で名前を一意（NAME モードの識別子。EMAIL モードでも同名禁止になるが運用上問題なし）
CREATE UNIQUE INDEX "users_tenant_id_name_key" ON "users"("tenant_id", "name");
