import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

const SESSION_NAME = 'auth-session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // データベースからユーザーを検索
    const user = await prisma.user.findUnique({
      where: {
        username: username,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // パスワードの検証
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // セッションにユーザーIDを保存
    const cookieStore = await cookies()
    const sessionData = JSON.stringify({
      userId: user.id,
      username: user.username,
      companyName: user.companyName
    })
    
    cookieStore.set(SESSION_NAME, sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    })

    return NextResponse.json({ 
      success: true,
      user: {
        username: user.username,
        companyName: user.companyName
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}