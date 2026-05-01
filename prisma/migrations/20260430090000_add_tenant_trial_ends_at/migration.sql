-- Tenant に無料トライアル期限カラムを追加。
-- null = 本契約（既存テナントは null のまま、これまでの挙動そのまま）。
-- 値あり & 未来 = トライアル中。
-- 値あり & 過去 = トライアル期限切れ（ログイン時に弾かれ isActive が false に落ちる）。
ALTER TABLE "tenants" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
