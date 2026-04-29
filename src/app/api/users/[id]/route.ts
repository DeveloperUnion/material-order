import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// ユーザー更新（管理者のみ）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;
    const body = await request.json();

    const { role, isActive, regeneratePasswordSetup } = body as {
      role?: UserRole;
      isActive?: boolean;
      regeneratePasswordSetup?: boolean;
    };

    // 対象ユーザーを取得
    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 同じテナントのユーザーのみ編集可能
    if (targetUser.tenantId !== currentUser.tenantId) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // 自分自身の権限は変更不可（ロックアウト防止）
    if (targetUser.id === currentUser.id) {
      if (role !== undefined && role !== currentUser.role) {
        return NextResponse.json(
          { error: '自分自身の権限は変更できません' },
          { status: 400 }
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: '自分自身を無効化することはできません' },
          { status: 400 }
        );
      }
    }

    // ロールの検証
    if (role !== undefined && role !== 'ADMIN' && role !== 'MEMBER') {
      return NextResponse.json(
        { error: '無効なロールです' },
        { status: 400 }
      );
    }

    // 最後の管理者を降格させないチェック
    if (role === 'MEMBER' && targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          tenantId: currentUser.tenantId,
          role: 'ADMIN',
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '最後の管理者を降格させることはできません' },
          { status: 400 }
        );
      }
    }

    // 更新データを構築
    const updateData: {
      role?: UserRole;
      isActive?: boolean;
      password?: null;
      joinedAt?: null;
      passwordSetupExpiresAt?: Date;
    } = {};
    if (role !== undefined) updateData.role = role as UserRole;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (regeneratePasswordSetup === true) {
      // NAME モード以外では拒否（EMAIL モードでは招待フローでパスワード再設定する）
      const tenant = await prisma.tenant.findUnique({
        where: { id: currentUser.tenantId },
        select: { authMode: true },
      });
      if (tenant?.authMode !== 'NAME') {
        return NextResponse.json(
          { error: 'パスワード再発行は名前認証のテナントのみ可能です' },
          { status: 400 }
        );
      }
      updateData.password = null;
      updateData.joinedAt = null;
      updateData.passwordSetupExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        joinedAt: true,
        passwordSetupExpiresAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'ユーザーの更新に失敗しました' },
      { status: 500 }
    );
  }
}
