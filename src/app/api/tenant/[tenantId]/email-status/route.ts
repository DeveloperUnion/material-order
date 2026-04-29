import { NextResponse } from 'next/server'
import { getCurrentPrismaClient } from '@/lib/tenant/server'

// EMAIL モード のテナントで、ユーザーが入力した email が「初回 PW 設定 / 再発行待ち」かを判定。
// プライバシー保護のため、判定結果は requiresSetup 1 つだけ返す
// （存在しない / 既に PW あり / 期限切れ はすべて requiresSetup=false）。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params

  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ requiresSetup: false })
    }

    const prisma = getCurrentPrismaClient()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { authMode: true, isActive: true, isSystem: true },
    })
    if (!tenant || !tenant.isActive || tenant.isSystem || tenant.authMode !== 'EMAIL') {
      return NextResponse.json({ requiresSetup: false })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        tenantId: true,
        password: true,
        passwordSetupExpiresAt: true,
        isActive: true,
      },
    })

    const requiresSetup =
      !!user &&
      user.tenantId === tenantId &&
      user.isActive &&
      user.password === null &&
      !!user.passwordSetupExpiresAt &&
      user.passwordSetupExpiresAt > new Date()

    return NextResponse.json({ requiresSetup })
  } catch (error) {
    console.error('Error checking email status:', error)
    return NextResponse.json({ requiresSetup: false })
  }
}
