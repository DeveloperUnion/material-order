import { NextResponse } from 'next/server'
import { getCurrentPrismaClient } from '@/lib/tenant/server'

// NAME モード のテナントの「ログイン候補者」一覧を返す。
// 返すのは id / name / hasPassword のみ（email・role は出さない）。
// EMAIL モードのテナントには 404 を返す（NAME モードのみで使う想定）。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params

  try {
    const prisma = getCurrentPrismaClient()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, authMode: true, isActive: true, isSystem: true },
    })

    if (!tenant || !tenant.isActive || tenant.isSystem || tenant.authMode !== 'NAME') {
      return new NextResponse(null, { status: 404 })
    }

    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        password: true, // hasPassword 判定用、レスポンスには載せない
        passwordSetupExpiresAt: true,
      },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    return NextResponse.json({
      tenant: { id: tenant.id, name: tenant.name },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        hasPassword: u.password !== null,
        canSetupPassword:
          u.password === null &&
          u.passwordSetupExpiresAt !== null &&
          u.passwordSetupExpiresAt > now,
      })),
    })
  } catch (error) {
    console.error('Error fetching tenant users:', error)
    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
