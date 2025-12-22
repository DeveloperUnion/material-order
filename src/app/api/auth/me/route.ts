import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantName: user.tenant.name
      }
    })
  } catch (error) {
    console.error('Error getting current user:', error)
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    )
  }
}