import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin, requireAuth } from '@/lib/auth';

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

export async function POST(request: Request) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();
    const { name, displayOrder } = body;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'カテゴリ名を入力してください' },
        { status: 400 }
      );
    }

    let resolvedDisplayOrder: number;
    if (typeof displayOrder === 'number' && Number.isFinite(displayOrder)) {
      resolvedDisplayOrder = displayOrder;
    } else {
      const last = await prisma.category.findFirst({
        where: { tenantId: currentUser.tenantId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      resolvedDisplayOrder = (last?.displayOrder ?? -1) + 1;
    }

    try {
      const created = await prisma.category.create({
        data: {
          tenantId: currentUser.tenantId,
          name: name.trim(),
          displayOrder: resolvedDisplayOrder,
        },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return NextResponse.json(
          { error: '同名のカテゴリが既に存在します' },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('カテゴリ作成エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'カテゴリの作成に失敗しました' },
      { status: 500 }
    );
  }
}