import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin, requireAuth } from '@/lib/auth';

// テナント情報取得
export async function GET() {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient();

    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        settings: true,
        maxUsers: true,
        isActive: true,
        authMode: true,
        createdAt: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        settings: tenant.settings,
        maxUsers: tenant.maxUsers,
        currentUsers: tenant._count.users,
        isActive: tenant.isActive,
        authMode: tenant.authMode,
        createdAt: tenant.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'テナント情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// テナント情報更新（管理者のみ）
export async function PUT(request: Request) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    const { name, settings } = body;

    // バリデーション
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: '会社名を入力してください' },
          { status: 400 }
        );
      }
      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: '会社名は100文字以内で入力してください' },
          { status: 400 }
        );
      }
    }

    // 更新データを構築
    const updateData: { name?: string; settings?: object } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (settings !== undefined) updateData.settings = settings;

    const updatedTenant = await prisma.tenant.update({
      where: { id: currentUser.tenantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    return NextResponse.json({ tenant: updatedTenant });
  } catch (error) {
    console.error('Error updating tenant:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'テナント情報の更新に失敗しました' },
      { status: 500 }
    );
  }
}
