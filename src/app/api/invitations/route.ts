import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAdmin } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { sendInvitationEmail } from '@/lib/email';

// 招待一覧取得（管理者のみ）
export async function GET() {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();

    const invitations = await prisma.invitation.findMany({
      where: {
        tenantId: currentUser.tenantId,
        usedAt: null, // 未使用のみ
        expiresAt: {
          gt: new Date(), // 有効期限内のみ
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '招待一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 新規招待作成（管理者のみ）
export async function POST(request: Request) {
  try {
    const currentUser = await requireAdmin();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    // ベースURL取得（リクエストヘッダーから動的に取得）
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const { email, role = 'MEMBER' } = body;

    // バリデーション
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'メールアドレスは必須です' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // ロールの検証
    if (role !== 'ADMIN' && role !== 'MEMBER') {
      return NextResponse.json(
        { error: '無効なロールです' },
        { status: 400 }
      );
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // 既存の有効な招待チェック
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'このメールアドレスには既に有効な招待が存在します' },
        { status: 409 }
      );
    }

    // テナントのユーザー数上限チェック
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      include: {
        users: { where: { isActive: true } },
        invitations: { where: { usedAt: null, expiresAt: { gt: new Date() } } },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    const currentCount = tenant.users.length + tenant.invitations.length;
    if (currentCount >= tenant.maxUsers) {
      return NextResponse.json(
        { error: `ユーザー数の上限（${tenant.maxUsers}名）に達しています` },
        { status: 400 }
      );
    }

    // 招待トークン生成（64文字のランダム文字列）
    const token = randomBytes(32).toString('hex');

    // 有効期限（7日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 招待URL生成
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // メール送信を先に実行（失敗したら招待を作成しない）
    const emailResult = await sendInvitationEmail({
      to: email.toLowerCase(),
      inviterName: currentUser.name,
      tenantName: tenant.name,
      role: role as 'ADMIN' | 'MEMBER',
      inviteUrl,
      expiresAt,
    });

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return NextResponse.json(
        { error: '招待メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    // メール送信成功後に招待を作成
    const invitation = await prisma.invitation.create({
      data: {
        tenantId: currentUser.tenantId,
        email: email.toLowerCase(),
        role: role as UserRole,
        token,
        expiresAt,
        createdBy: currentUser.id,
      },
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      emailSent: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);

    if (error instanceof Error) {
      if (error.message === '認証が必要です') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === '管理者権限が必要です') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '招待の作成に失敗しました' },
      { status: 500 }
    );
  }
}
