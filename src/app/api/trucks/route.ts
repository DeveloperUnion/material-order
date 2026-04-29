import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromRequest } from '@/lib/tenant/server';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const prisma = getPrismaClientFromRequest(request);

    const trucks = await prisma.truck.findMany({
      where: {
        tenantId: currentUser.tenantId,
        isActive: true,
      },
      orderBy: [
        { capacityKg: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(trucks);
  } catch (error) {
    console.error('トラック取得エラー:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'トラックの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getPrismaClientFromRequest(request);
    const body = await request.json();
    const { name, capacityKg } = body;

    if (!name || capacityKg === null || capacityKg === undefined) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const capacityNum = Number(capacityKg);
    if (!Number.isFinite(capacityNum) || capacityNum <= 0) {
      return NextResponse.json(
        { error: '積載量は正の数で指定してください' },
        { status: 400 }
      );
    }

    const truck = await prisma.truck.create({
      data: {
        tenantId: currentUser.tenantId,
        name: String(name).trim(),
        capacityKg: Math.round(capacityNum),
        isActive: true,
      },
    });

    return NextResponse.json(truck, { status: 201 });
  } catch (error) {
    console.error('トラック作成エラー:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'トラックの作成に失敗しました' },
      { status: 500 }
    );
  }
}
