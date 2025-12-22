import { PrismaClient } from '@prisma/client'
import { seedCategories } from './seeds/categories'
import { seedWakuMaterials } from './seeds/materials-waku'
import { seedSheetMaterials } from './seeds/materials-sheet'
import { seedOtherMaterials } from './seeds/materials-other'
import { seedKusabiMaterials } from './seeds/materials-kusabi'
import { seedTenantAndAdmin } from './seeds/users'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 本番環境にデータを投入中...\n')

  // 既存データはクリアしない（本番環境では安全性を重視）
  console.log('⚠️  注意: 既存データはクリアしません（本番環境用）')

  // 1. テナントとAdminユーザーを作成
  const tenantId = await seedTenantAndAdmin(prisma)

  // 2. カテゴリを作成/更新
  await seedCategories(prisma, tenantId)

  // 3. 枠の資材を投入/更新
  await seedWakuMaterials(prisma, tenantId)

  // 4. シートの資材を投入/更新
  await seedSheetMaterials(prisma, tenantId)

  // 5. その他の資材を投入/更新
  await seedOtherMaterials(prisma, tenantId)

  // 6. くさびの資材を投入/更新
  await seedKusabiMaterials(prisma, tenantId)

  // 最終確認
  const tenantCount = await prisma.tenant.count()
  const categoryCount = await prisma.category.count()
  const materialCount = await prisma.material.count()
  const userCount = await prisma.user.count()

  console.log('\n📊 現在のデータベースの状態:')
  console.log(`  - テナント: ${tenantCount}件`)
  console.log(`  - カテゴリ: ${categoryCount}件`)
  console.log(`  - 資材: ${materialCount}件`)
  console.log(`  - ユーザー: ${userCount}件`)
  console.log('\n✨ 本番環境へのデータ投入が完了しました！')
}

main()
  .catch((e) => {
    console.error('❌ エラーが発生しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })