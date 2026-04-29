import { PrismaClient } from '@prisma/client'

export async function seedTrucks(prisma: PrismaClient, tenantId: string) {
  console.log('🚚 トラックデータを投入中...')

  const trucks = [
    { name: '軽トラ', capacityKg: 350 },
    { name: '2tトラック', capacityKg: 2000 },
    { name: '4tトラック', capacityKg: 4000 },
    { name: '10tトラック', capacityKg: 10000 },
  ]

  for (const truck of trucks) {
    const existing = await prisma.truck.findFirst({
      where: { tenantId, name: truck.name },
    })

    if (existing) {
      console.log(`  - ${truck.name} は既に存在`)
      continue
    }

    await prisma.truck.create({
      data: {
        tenantId,
        name: truck.name,
        capacityKg: truck.capacityKg,
        isActive: true,
      },
    })
    console.log(`  ✓ ${truck.name} (${truck.capacityKg}kg) を作成`)
  }

  console.log('✅ トラックデータの投入完了\n')
}
