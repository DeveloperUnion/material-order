import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { sendRegistrationWelcomeEmail } from '@/lib/email';
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
            code: true,
            name: true,
            authMode: true,
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
        tenantId: invitation.tenant.id,
        tenantCode: invitation.tenant.code,
        tenantName: invitation.tenant.name,
        tenantAuthMode: invitation.tenant.authMode,
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

    // (tenantId, name) 重複の事前チェック
    const collidingName = await prisma.user.findUnique({
      where: { tenantId_name: { tenantId: invitation.tenantId, name: name.trim() } },
      select: { id: true },
    });
    if (collidingName) {
      return NextResponse.json(
        { error: 'この会社に既に同じ名前のメンバーがいます。別の表記でお願いします（例: 山田 太郎(現場A)）' },
        { status: 409 }
      );
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // トランザクションでユーザー作成と招待更新
    const now = new Date();
    let user;
    try {
      [user] = await prisma.$transaction([
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: 'この会社に既に同じ名前のメンバーがいます。別の表記でお願いします' },
          { status: 409 }
        );
      }
      throw e;
    }

    // ベース URL を組み立て、登録完了ウェルカムメールを送信
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const loginUrl = `${baseUrl}/${invitation.tenant.code}`;

    const welcomeEmailResult = await sendRegistrationWelcomeEmail({
      to: invitation.email,
      userName: name.trim(),
      tenantName: invitation.tenant.name,
      loginUrl,
    });

    if (!welcomeEmailResult.success) {
      // 登録自体は成功扱いのまま、画面側でフォールバック表示にさせる
      console.error('Welcome email send failed:', welcomeEmailResult.error);
    }

    return NextResponse.json({
      message: '登録が完了しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: invitation.tenant.id,
        code: invitation.tenant.code,
        authMode: invitation.tenant.authMode,
      },
      emailSent: welcomeEmailResult.success,
      loginUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}
