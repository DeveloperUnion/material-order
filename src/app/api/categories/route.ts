import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';

export async function GET() {
  try {
    const prisma = await getCurrentPrismaClient()
    const categories = await prisma.category.findMany({
      orderBy: {
        displayOrder: 'asc'
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('カテゴリ取得エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリの取得に失敗しました' },
      { status: 500 }
    );
  }
}