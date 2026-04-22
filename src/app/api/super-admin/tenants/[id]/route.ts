import { NextResponse } from 'next/server'
import { prisma } from '@/lib/tenant/prisma'
import { getSuperAdminSession } from '@/lib/auth/super-admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
      },
      invitations: {
        where: { usedAt: null },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      },
      _count: { select: { users: true, orders: true, materials: true } },
    },
  })

  if (!tenant || tenant.isSystem) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ tenant })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant || tenant.isSystem) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }

  let body: { name?: string; maxUsers?: number; isActive?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const data: { name?: string; maxUsers?: number; isActive?: boolean } = {}
  if (typeof body.name === 'string' && body.name.trim().length > 0) {
    data.name = body.name.trim()
  }
  if (typeof body.maxUsers === 'number' && Number.isFinite(body.maxUsers)) {
    const userCount = await prisma.user.count({ where: { tenantId: id } })
    if (body.maxUsers < userCount) {
      return NextResponse.json(
        { error: `現在のユーザー数 (${userCount}) より小さい値には設定できません` },
        { status: 400 }
      )
    }
    data.maxUsers = Math.max(1, Math.min(999, Math.floor(body.maxUsers)))
  }
  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '更新対象がありません' }, { status: 400 })
  }

  const updated = await prisma.tenant.update({ where: { id }, data })
  return NextResponse.json({ tenant: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }
  if (tenant.isSystem) {
    return NextResponse.json(
      { error: 'system テナントは削除できません' },
      { status: 400 }
    )
  }

  // Order の onDelete:Cascade で OrderDetail / TemporaryMaterials が消える
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { tenantId: id } }),
    prisma.material.deleteMany({ where: { tenantId: id } }),
    prisma.category.deleteMany({ where: { tenantId: id } }),
    prisma.invitation.deleteMany({ where: { tenantId: id } }),
    prisma.user.deleteMany({ where: { tenantId: id } }),
    prisma.tenant.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
