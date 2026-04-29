import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

const PASSWORD_SETUP_HOURS = 24;

// ユーザー一覧取得（管理者のみ）
export async function GET() {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();

    const users = await prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        invitedAt: true,
        joinedAt: true,
        passwordSetupExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// メンバー直接作成（NAME モード専用、管理者のみ）
// EMAIL モードのテナントでは 400 を返す（招待フローを使う）
export async function POST(request: Request) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const body = (await request.json().catch(() => null)) as
      | { name?: string; email?: string; role?: 'ADMIN' | 'MEMBER' }
      | null;

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: '名前を入力してください' },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: '名前は1〜100文字で入力してください' },
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    const role = body.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      include: {
        _count: { select: { users: { where: { isActive: true } } } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    }
    if (tenant.authMode !== 'NAME') {
      return NextResponse.json(
        { error: 'このテナントは EMAIL 方式です。招待フローを使ってください' },
        { status: 400 }
      );
    }

    // ユーザー数上限チェック
    const pendingInvitations = await prisma.invitation.count({
      where: {
        tenantId: currentUser.tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (tenant._count.users + pendingInvitations >= tenant.maxUsers) {
      return NextResponse.json(
        { error: `ユーザー数の上限（${tenant.maxUsers}名）に達しています` },
        { status: 400 }
      );
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        );
      }
    }

    const expiresAt = new Date(Date.now() + PASSWORD_SETUP_HOURS * 60 * 60 * 1000);

    try {
      const user = await prisma.user.create({
        data: {
          tenantId: currentUser.tenantId,
          email,
          name,
          role,
          isActive: true,
          invitedAt: new Date(),
          passwordSetupExpiresAt: expiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          invitedAt: true,
          joinedAt: true,
          passwordSetupExpiresAt: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ user }, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: '同じ名前のメンバーが既に存在します' },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'ユーザーの作成に失敗しました' },
      { status: 500 }
    );
  }
}
