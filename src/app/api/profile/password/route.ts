import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcrypt';

// パスワード変更
export async function PUT(request: Request) {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient();
    const body = await request.json();

    const { currentPassword, newPassword } = body;

    // バリデーション
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードを入力してください' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: '新しいパスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    // 現在のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'パスワードの変更に失敗しました' },
        { status: 400 }
      );
    }

    // 現在のパスワードを検証
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error('Error changing password:', error);

    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500 }
    );
  }
}
