import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;
    const body = await request.json();

    const { name, capacityKg, isActive } = body;

    const truck = await prisma.truck.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!truck) {
      return NextResponse.json({ error: 'トラックが見つかりません' }, { status: 404 });
    }

    if (truck.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (capacityKg !== undefined) {
      const capacityNum = Number(capacityKg);
      if (!Number.isFinite(capacityNum) || capacityNum <= 0) {
        return NextResponse.json(
          { error: '積載量は正の数で指定してください' },
          { status: 400 }
        );
      }
      updateData.capacityKg = Math.round(capacityNum);
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.truck.update({
      where: { id: resolvedParams.id },
      data: updateData,
    });

    return NextResponse.json({ truck: updated });
  } catch (error) {
    console.error('トラック更新エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'トラックの更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;

    const truck = await prisma.truck.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!truck) {
      return NextResponse.json({ error: 'トラックが見つかりません' }, { status: 404 });
    }

    if (truck.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 論理削除（過去発注は truckName / truckCapacityKg のスナップショットで残る）
    await prisma.truck.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('トラック削除エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'トラックの削除に失敗しました' },
      { status: 500 }
    );
  }
}
