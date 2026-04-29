import { NextResponse } from 'next/server'
import { prisma } from '@/lib/tenant/prisma'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { buildTemplateCsv } from '@/lib/material/csvImport'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant || tenant.isSystem) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }

  const csv = buildTemplateCsv()
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="materials-template-${tenant.code}.csv"`,
    },
  })
}
