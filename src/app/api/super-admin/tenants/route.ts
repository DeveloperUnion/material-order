import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/tenant/prisma'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { sendInvitationEmail } from '@/lib/email'

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

export async function POST(request: Request) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  let body: {
    companyName?: string
    adminEmail?: string
    adminName?: string
    maxUsers?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  const adminEmail = body.adminEmail?.trim().toLowerCase()
  const adminName = body.adminName?.trim() || '管理者'
  const maxUsers = Math.max(1, Math.min(999, body.maxUsers ?? 10))

  if (!companyName) {
    return NextResponse.json({ error: '会社名を入力してください' }, { status: 400 })
  }
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 })
  }

  // 既存 User / Invitation 重複チェック
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

  const existingTenant = await prisma.tenant.findFirst({ where: { name: companyName } })
  if (existingTenant) {
    return NextResponse.json(
      { error: `「${companyName}」という名前のテナントは既に存在します` },
      { status: 409 }
    )
  }

  // baseUrl をリクエストから動的取得（環境ごとに正しい URL になる）
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const inviteUrl = `${baseUrl}/invite/${token}`

  // メールを先に送る（失敗時にテナントを作らない）
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

  const [tenant] = await prisma.$transaction([
    prisma.tenant.create({
      data: {
        name: companyName,
        maxUsers,
        isActive: true,
      },
    }),
  ])

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

  // adminName は現状保持場所がない（User は招待承認時に作られる）。
  // UI 表示用に渡されるが、DB には承認時にユーザーが自分で入力した名前が入る。
  void adminName

  return NextResponse.json(
    { tenant: { id: tenant.id, name: tenant.name } },
    { status: 201 }
  )
}
