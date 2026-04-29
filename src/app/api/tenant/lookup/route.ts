import { NextResponse } from 'next/server'
import { getCurrentPrismaClient } from '@/lib/tenant/server'

// 会社コードからテナントを完全一致で検索する。
// 入力: ?code=oken（クエリ）
// 返却: { id, name, authMode } のみ（外部からの偵察を最小化）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toLowerCase()

    if (!code || code.length < 1 || code.length > 64) {
      return NextResponse.json(
        { error: '会社コードを入力してください' },
        { status: 400 }
      )
    }

    const prisma = getCurrentPrismaClient()
    const tenant = await prisma.tenant.findUnique({
      where: { code },
      select: { id: true, name: true, authMode: true, isActive: true, isSystem: true },
    })

    if (!tenant || !tenant.isActive || tenant.isSystem) {
      return NextResponse.json(
        { error: '会社コードが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        authMode: tenant.authMode,
      },
    })
  } catch (error) {
    console.error('Error looking up tenant:', error)
    return NextResponse.json(
      { error: 'テナントの検索に失敗しました' },
      { status: 500 }
    )
  }
}
