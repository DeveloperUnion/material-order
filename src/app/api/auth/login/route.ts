import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcrypt'
import { getPrismaClientFromRequest } from '@/lib/tenant/server'
import { SessionData } from '@/lib/auth'

const SESSION_NAME = 'auth-session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // テナント用Prismaクライアントを取得
    const prisma = getPrismaClientFromRequest(request)

    // データベースからユーザーを検索（テナント情報も含む）
    const user = await prisma.user.findUnique({
      where: {
        email: email,
        isActive: true
      },
      include: {
        tenant: true
      }
    })

    // ユーザーが存在しない、またはテナントが無効
    if (!user || !user.tenant.isActive) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // パスワードの検証（パスワードがnullの場合はSSO専用ユーザー）
    if (!user.password) {
      return NextResponse.json(
        { error: 'このアカウントはパスワードログインに対応していません' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // 最終ログイン日時を更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // セッションにユーザー情報を保存
    const cookieStore = await cookies()
    const sessionData: SessionData = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role
    }

    cookieStore.set(SESSION_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    })

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        tenantName: user.tenant.name
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}