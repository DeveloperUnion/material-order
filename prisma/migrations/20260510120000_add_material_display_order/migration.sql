-- AlterTable
ALTER TABLE "materials" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

-- 既存資材に対して、テナント単位でカテゴリ並び順 → 資材コード順に
-- 連番（0 起点）を振り直す。これにより既存 UI と同じ並びを維持する。
WITH ordered AS (
  SELECT
    m.id,
    ROW_NUMBER() OVER (
      PARTITION BY m.tenant_id
      ORDER BY
        COALESCE(c.display_order, 2147483647) ASC,
        m.material_code ASC
    ) - 1 AS new_order
  FROM "materials" m
  LEFT JOIN "categories" c ON c.id = m.category_id
)
UPDATE "materials" m
SET "display_order" = ordered.new_order
FROM ordered
WHERE m.id = ordered.id;

-- CreateIndex
CREATE INDEX "materials_tenant_id_display_order_idx" ON "materials"("tenant_id", "display_order");
