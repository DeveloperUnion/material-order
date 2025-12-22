import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// テナントIDをエクスポート（他のseedファイルで使用）
export let defaultTenantId: string

export async function seedTenantAndAdmin(prisma: PrismaClient) {
  console.log('🏢 テナントとAdminユーザーを作成中...')

  // 1. テナント作成（既存があれば取得、なければ作成）
  let tenant = await prisma.tenant.findFirst({
    where: { name: '建設テック' }
  })

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: '建設テック',
        maxUsers: 10,
        isActive: true,
      }
    })
  }

  defaultTenantId = tenant.id
  console.log(`  ✅ テナント「${tenant.name}」を作成しました`)

  // 2. Adminユーザー作成
  const adminEmail = 'admin@kensetsu-tech.com'
  const adminPassword = 'Admin1234'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: '管理者',
      role: 'ADMIN',
    },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      password: hashedPassword,
      name: '管理者',
      role: 'ADMIN',
      isActive: true,
      joinedAt: new Date(),
    }
  })

  console.log(`  ✅ Adminユーザーを作成しました`)
  console.log(`     メール: ${adminEmail}`)
  console.log(`     パスワード: ${adminPassword}`)
  console.log('✅ テナントとAdminユーザーの作成完了\n')

  return tenant.id
}
