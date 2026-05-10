import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

interface ReorderUpdate {
  id: string;
  displayOrder: number;
  categoryId: string | null;
}

function isReorderUpdate(value: unknown): value is ReorderUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.displayOrder !== 'number' || !Number.isFinite(v.displayOrder)) return false;
  if (v.categoryId !== null && typeof v.categoryId !== 'string') return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    if (!body || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'updates 配列が必要です' },
        { status: 400 }
      );
    }
    const updates: unknown[] = body.updates;
    if (updates.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }
    if (!updates.every(isReorderUpdate)) {
      return NextResponse.json(
        { error: '並び替え情報の形式が不正です' },
        { status: 400 }
      );
    }
    const typed = updates as ReorderUpdate[];

    // id の重複は受け付けない（同じ material を複数回更新する意味がない）
    const ids = typed.map((u) => u.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { error: '同一資材が複数指定されています' },
        { status: 400 }
      );
    }

    // 自テナントの material であることを 1 クエリで検証
    const owned = await prisma.material.findMany({
      where: { id: { in: ids }, tenantId: currentUser.tenantId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json(
        { error: '対象資材が見つかりません' },
        { status: 404 }
      );
    }

    // 指定された categoryId が自テナントの category であることを検証
    const categoryIds = Array.from(
      new Set(
        typed
          .map((u) => u.categoryId)
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      )
    );
    if (categoryIds.length > 0) {
      const ownedCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, tenantId: currentUser.tenantId },
        select: { id: true },
      });
      if (ownedCategories.length !== categoryIds.length) {
        return NextResponse.json(
          { error: 'カテゴリが見つかりません' },
          { status: 404 }
        );
      }
    }

    await prisma.$transaction(
      typed.map((u) =>
        prisma.material.update({
          where: { id: u.id },
          data: {
            displayOrder: u.displayOrder,
            categoryId: u.categoryId,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: typed.length });
  } catch (error) {
    console.error('資材並び替えエラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '資材の並び替えに失敗しました' },
      { status: 500 }
    );
  }
}
