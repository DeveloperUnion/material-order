import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient()

    const categories = await prisma.category.findMany({
      where: {
        tenantId: currentUser.tenantId
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('カテゴリ取得エラー:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'カテゴリの取得に失敗しました' },
      { status: 500 }
    );
  }
}