import { PrismaClient } from '@prisma/client'

export async function seedCategories(prisma: PrismaClient, tenantId: string) {
  console.log('📂 カテゴリデータを投入中...')

  const categories = [
    { name: '枠', displayOrder: 1 },
    { name: 'くさび', displayOrder: 2 },
    { name: 'シート', displayOrder: 3 },
    { name: 'その他', displayOrder: 4 },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: category.name
        }
      },
      update: {
        displayOrder: category.displayOrder
      },
      create: {
        tenantId,
        name: category.name,
        displayOrder: category.displayOrder
      }
    })
    console.log(`  ✓ ${category.name} カテゴリを作成/更新`)
  }

  console.log('✅ カテゴリデータの投入完了\n')
}
