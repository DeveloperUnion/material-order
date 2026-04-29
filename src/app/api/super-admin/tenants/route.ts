import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { TenantAuthMode } from '@prisma/client'
import { prisma } from '@/lib/tenant/prisma'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { sendInvitationEmail } from '@/lib/email'
import { isReservedTenantCode } from '@/lib/tenant/reserved'

export async function GET() {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const tenants = await prisma.tenant.findMany({
    where: { isSystem: false },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, orders: true } } },
  })

  return NextResponse.json({ tenants })
}

const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

export async function POST(request: Request) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  let body: {
    companyName?: string
    tenantCode?: string
    adminEmail?: string
    adminName?: string
    maxUsers?: number
    authMode?: TenantAuthMode
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  const tenantCode = body.tenantCode?.trim().toLowerCase()
  const adminEmail = body.adminEmail?.trim().toLowerCase()
  const adminName = body.adminName?.trim() || '管理者'
  const maxUsers = Math.max(1, Math.min(999, body.maxUsers ?? 10))
  const authMode: TenantAuthMode = body.authMode === 'NAME' ? 'NAME' : 'EMAIL'

  if (!companyName) {
    return NextResponse.json({ error: '会社名を入力してください' }, { status: 400 })
  }
  if (!tenantCode || !CODE_PATTERN.test(tenantCode)) {
    return NextResponse.json(
      { error: '会社コードは英小文字・数字・ハイフンの 3〜64 文字で、先頭末尾は英数字にしてください' },
      { status: 400 }
    )
  }
  if (isReservedTenantCode(tenantCode)) {
    return NextResponse.json(
      { error: `「${tenantCode}」はシステム予約語のため使用できません` },
      { status: 400 }
    )
  }
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: '有効な管理者メールアドレスを入力してください' }, { status: 400 })
  }

  const existingTenantByCode = await prisma.tenant.findUnique({ where: { code: tenantCode } })
  if (existingTenantByCode) {
    return NextResponse.json(
      { error: `会社コード「${tenantCode}」は既に使われています` },
      { status: 409 }
    )
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existingUser) {
    return NextResponse.json(
      { error: 'このメールアドレスは既に登録されています' },
      { status: 409 }
    )
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: { email: adminEmail, usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (existingInvitation) {
    return NextResponse.json(
      { error: 'このメールアドレスには既に有効な招待が存在します' },
      { status: 409 }
    )
  }

  const existingTenantByName = await prisma.tenant.findFirst({ where: { name: companyName } })
  if (existingTenantByName) {
    return NextResponse.json(
      { error: `「${companyName}」という名前のテナントは既に存在します` },
      { status: 409 }
    )
  }

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const inviteUrl = `${baseUrl}/invite/${token}`

  const emailResult = await sendInvitationEmail({
    to: adminEmail,
    inviterName: session.user.name || 'Super Admin',
    tenantName: companyName,
    role: 'ADMIN',
    inviteUrl,
    expiresAt,
  })

  if (!emailResult.success) {
    return NextResponse.json(
      { error: `招待メールの送信に失敗しました: ${emailResult.error ?? ''}` },
      { status: 500 }
    )
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
      code: tenantCode,
      authMode,
      maxUsers,
      isActive: true,
    },
  })

  await prisma.invitation.create({
    data: {
      tenantId: tenant.id,
      email: adminEmail,
      role: 'ADMIN',
      token,
      expiresAt,
      createdBy: session.user.id,
    },
  })

  void adminName

  return NextResponse.json(
    {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        authMode: tenant.authMode,
      },
      loginUrl: baseUrl,
    },
    { status: 201 }
  )
}
