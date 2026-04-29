import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';

// 資材更新（管理者のみ）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;
    const body = await request.json();

    const { name, size, weightKg, categoryId, isActive } = body;

    const material = await prisma.material.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!material) {
      return NextResponse.json(
        { error: '資材が見つかりません' },
        { status: 404 }
      );
    }

    if (material.tenantId !== currentUser.tenantId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (size !== undefined) updateData.size = size || null;
    if (weightKg !== undefined) updateData.weightKg = parseFloat(weightKg);
    if (categoryId !== undefined) {
      const normalized: string | null =
        typeof categoryId === 'string' && categoryId.length > 0 ? categoryId : null;
      if (normalized) {
        const category = await prisma.category.findFirst({
          where: { id: normalized, tenantId: currentUser.tenantId },
        });
        if (!category) {
          return NextResponse.json(
            { error: 'カテゴリが見つかりません' },
            { status: 404 }
          );
        }
      }
      updateData.categoryId = normalized;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.material.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json({ material: updated });
  } catch (error) {
    console.error('資材更新エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '資材の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 資材削除（無効化、管理者のみ）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const resolvedParams = await params;

    const material = await prisma.material.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!material) {
      return NextResponse.json(
        { error: '資材が見つかりません' },
        { status: 404 }
      );
    }

    if (material.tenantId !== currentUser.tenantId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 論理削除（isActive = false）
    await prisma.material.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('資材削除エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '資材の削除に失敗しました' },
      { status: 500 }
    );
  }
}
