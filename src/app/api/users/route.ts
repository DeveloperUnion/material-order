import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

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
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
