import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';

// 現在のユーザー情報取得
export async function GET() {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        joinedAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        tenantName: user.tenant.name,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// プロフィール更新（名前のみ）
export async function PUT(request: Request) {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    const { name } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名前を入力してください' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: '名前は100文字以内で入力してください' },
        { status: 400 }
      );
    }

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: { name: name.trim() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: '同じ名前のメンバーが既に存在します。別の表記にしてください' },
          { status: 409 }
        );
      }
      throw e;
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}
