import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

interface ReorderUpdate {
  id: string;
  displayOrder: number;
}

function isReorderUpdate(value: unknown): value is ReorderUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.displayOrder !== 'number' || !Number.isFinite(v.displayOrder)) return false;
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

    const ids = typed.map((u) => u.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { error: '同一カテゴリが複数指定されています' },
        { status: 400 }
      );
    }

    const owned = await prisma.category.findMany({
      where: { id: { in: ids }, tenantId: currentUser.tenantId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json(
        { error: '対象カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    await prisma.$transaction(
      typed.map((u) =>
        prisma.category.update({
          where: { id: u.id },
          data: { displayOrder: u.displayOrder },
        })
      )
    );

    return NextResponse.json({ success: true, updated: typed.length });
  } catch (error) {
    console.error('カテゴリ並び替えエラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'カテゴリの並び替えに失敗しました' },
      { status: 500 }
    );
  }
}
