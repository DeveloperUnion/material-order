import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPrismaClientFromRequest } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';
import { generateMaterialCode } from '@/lib/material/generateMaterialCode';

const MATERIAL_ORDER_BY: Prisma.MaterialOrderByWithRelationInput[] = [
  { category: { displayOrder: 'asc' } },
  { materialCode: 'asc' },
];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const prisma = getPrismaClientFromRequest(request)
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    // 通常の材料を取得（テナントでフィルタリング）
    const materials = await prisma.material.findMany({
      where: {
        tenantId: currentUser.tenantId,
        isActive: true,
        isTemporary: false
      },
      include: {
        category: true
      },
      orderBy: MATERIAL_ORDER_BY,
    });

    // orderIdが指定されている場合は、その発注用の一時材料も取得
    if (orderId) {
      const temporaryMaterials = await prisma.material.findMany({
        where: {
          tenantId: currentUser.tenantId,
          isActive: true,
          isTemporary: true,
          createdForOrderId: orderId
        },
        include: {
          category: true
        },
        orderBy: MATERIAL_ORDER_BY,
      });

      // 通常の材料と一時材料を結合
      return NextResponse.json([...materials, ...temporaryMaterials]);
    }

    return NextResponse.json(materials);
  } catch (error) {
    console.error('資材取得エラー:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '資材の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const prisma = getPrismaClientFromRequest(request)
    const body = await request.json();
    const {
      name,
      categoryId: rawCategoryId,
      materialCode: rawMaterialCode,
      size,
      weightKg,
      isTemporary,
      createdForOrderId,
    } = body;

    if (!name || weightKg === null || weightKg === undefined) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const categoryId: string | null =
      typeof rawCategoryId === 'string' && rawCategoryId.length > 0 ? rawCategoryId : null;

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId: currentUser.tenantId },
      });
      if (!category) {
        return NextResponse.json(
          { error: 'カテゴリが見つかりません' },
          { status: 404 }
        );
      }
    }

    const userMaterialCode =
      typeof rawMaterialCode === 'string' && rawMaterialCode.trim().length > 0
        ? rawMaterialCode.trim()
        : null;

    // ユーザー指定がなければテナント単位の連番 (M-001) で採番。
    // unique 制約衝突は並行作成時のみ発生しうるため、その場合は採番をやり直す。
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const materialCode =
        userMaterialCode ?? (await generateMaterialCode(prisma, currentUser.tenantId));

      try {
        const newMaterial = await prisma.material.create({
          data: {
            tenantId: currentUser.tenantId,
            materialCode,
            name,
            categoryId,
            size: size || null,
            weightKg: parseFloat(weightKg),
            isActive: true,
            isTemporary: isTemporary || false,
            createdForOrderId: createdForOrderId || null,
          },
          include: { category: true },
        });
        return NextResponse.json(newMaterial, { status: 201 });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          if (userMaterialCode) {
            return NextResponse.json(
              { error: '指定された品番は既に使用されています' },
              { status: 409 }
            );
          }
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(
      { error: '品番の自動採番に失敗しました。再度お試しください。' },
      { status: 500 }
    );
  } catch (error) {
    console.error('材料作成エラー:', error);
    return NextResponse.json(
      { error: '材料の作成に失敗しました' },
      { status: 500 }
    );
  }
}