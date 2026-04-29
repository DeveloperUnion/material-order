import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;
    const body = await request.json();
    const { name, displayOrder } = body;

    const category = await prisma.category.findFirst({
      where: { id: resolvedParams.id, tenantId: currentUser.tenantId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    const updateData: Prisma.CategoryUpdateInput = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'カテゴリ名を入力してください' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (displayOrder !== undefined) {
      if (typeof displayOrder !== 'number' || !Number.isFinite(displayOrder)) {
        return NextResponse.json(
          { error: '並び順が不正です' },
          { status: 400 }
        );
      }
      updateData.displayOrder = displayOrder;
    }

    try {
      const updated = await prisma.category.update({
        where: { id: resolvedParams.id },
        data: updateData,
      });
      return NextResponse.json(updated);
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
    console.error('カテゴリ更新エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'カテゴリの更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;

    const category = await prisma.category.findFirst({
      where: { id: resolvedParams.id, tenantId: currentUser.tenantId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    // FK が ON DELETE SET NULL のため、紐づく Material の categoryId は null に落ちる。
    await prisma.category.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('カテゴリ削除エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'カテゴリの削除に失敗しました' },
      { status: 500 }
    );
  }
}
