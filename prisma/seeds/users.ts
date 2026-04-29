import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// テナントIDをエクスポート（他のseedファイルで使用）
export let defaultTenantId: string

export async function seedTenantAndAdmin(prisma: PrismaClient) {
  console.log('🏢 テナントとAdminユーザーを作成中...')

  // 1. テナント作成（code は unique なので upsert）
  const tenant = await prisma.tenant.upsert({
    where: { code: 'union' },
    update: {
      name: 'ユニオン',
      authMode: 'NAME',
    },
    create: {
      name: 'ユニオン',
      code: 'union',
      authMode: 'NAME',
      maxUsers: 10,
      isActive: true,
    }
  })

  defaultTenantId = tenant.id
  console.log(`  ✅ テナント「${tenant.name}」を作成しました`)

  // 2. Adminユーザー作成（NAME モードなので tenantId + name で一意）
  const adminName = '開発者'
  const adminPassword = 'Admin1234'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: adminName } },
    update: {
      email: null,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      passwordSetupExpiresAt: null,
    },
    create: {
      tenantId: tenant.id,
      email: null,
      password: hashedPassword,
      name: adminName,
      role: 'ADMIN',
      isActive: true,
      joinedAt: new Date(),
    }
  })

  console.log(`  ✅ Adminユーザーを作成しました`)
  console.log(`     名前: ${adminName}`)
  console.log(`     パスワード: ${adminPassword}`)
  console.log('✅ テナントとAdminユーザーの作成完了\n')

  return tenant.id
}
