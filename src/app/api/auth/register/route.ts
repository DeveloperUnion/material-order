import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import bcrypt from 'bcrypt';

// 招待トークンの検証
export async function GET(request: Request) {
  try {
    const prisma = getCurrentPrismaClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: '招待トークンが必要です' },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: '無効な招待トークンです' },
        { status: 404 }
      );
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'この招待は既に使用されています' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'この招待の有効期限が切れています' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { error: '招待の検証に失敗しました' },
      { status: 500 }
    );
  }
}

// 招待からユーザー登録
export async function POST(request: Request) {
  try {
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    const { token, name, password } = body;

    // バリデーション
    if (!token || !name || !password) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json(
        { error: '名前を入力してください' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    // 招待の検証
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: '無効な招待トークンです' },
        { status: 404 }
      );
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'この招待は既に使用されています' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'この招待の有効期限が切れています' },
        { status: 400 }
      );
    }

    if (!invitation.tenant.isActive) {
      return NextResponse.json(
        { error: 'このテナントは無効です' },
        { status: 400 }
      );
    }

    // 既存ユーザーチェック（念のため）
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // トランザクションでユーザー作成と招待更新
    const now = new Date();
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          tenantId: invitation.tenantId,
          email: invitation.email,
          password: hashedPassword,
          name: name.trim(),
          role: invitation.role,
          isActive: true,
          invitedAt: invitation.createdAt,
          joinedAt: now,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: now },
      }),
    ]);

    return NextResponse.json({
      message: '登録が完了しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}
