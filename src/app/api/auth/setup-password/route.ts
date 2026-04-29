import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getCurrentPrismaClient } from '@/lib/tenant/server'

// メンバーが初回パスワードを設定する。または ADMIN が再発行した後の再設定。
// 入力: { tenantId, password, userId? | email? }
//   - NAME モード: tenantId + userId（名前選択画面で得る）
//   - EMAIL モード: tenantId + email（メール入力画面で得る）
// 検証: tenantId 一致 / user.password === null / passwordSetupExpiresAt が未来 / user.isActive
export async function POST(request: Request) {
  try {
    const prisma = getCurrentPrismaClient()
    const body = (await request.json().catch(() => null)) as
      | { tenantId?: string; userId?: string; email?: string; password?: string }
      | null

    if (!body?.tenantId || !body?.password || (!body.userId && !body.email)) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      )
    }

    const user = body.userId
      ? await prisma.user.findUnique({
          where: { id: body.userId },
          include: { tenant: true },
        })
      : await prisma.user.findUnique({
          where: { email: body.email!.toLowerCase() },
          include: { tenant: true },
        })

    if (
      !user ||
      user.tenantId !== body.tenantId ||
      !user.isActive ||
      !user.tenant.isActive
    ) {
      return NextResponse.json(
        { error: '対象のユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (user.password !== null) {
      return NextResponse.json(
        { error: 'このユーザーは既にパスワードが設定されています' },
        { status: 409 }
      )
    }

    if (
      !user.passwordSetupExpiresAt ||
      user.passwordSetupExpiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: 'パスワード設定の有効期限が切れています。管理者に再発行を依頼してください' },
        { status: 410 }
      )
    }

    const hashed = await bcrypt.hash(body.password, 10)
    const now = new Date()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        // joinedAt は初回登録時のみセット、再発行後の再設定では維持する
        joinedAt: user.joinedAt ?? now,
        passwordSetupExpiresAt: null,
        lastLoginAt: now,
      },
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        tenantId: user.tenantId,
      },
    })
  } catch (error) {
    console.error('Error setting up password:', error)
    return NextResponse.json(
      { error: 'パスワード設定に失敗しました' },
      { status: 500 }
    )
  }
}
