import { NextResponse } from 'next/server'
import { prisma } from '@/lib/tenant/prisma'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import {
  CsvImportError,
  executeImport,
  planImport,
} from '@/lib/material/csvImport'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSuperAdminSession()
  if (!session) return new NextResponse(null, { status: 404 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant || tenant.isSystem) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

  let csvText: string
  try {
    csvText = await readCsv(request)
  } catch (e) {
    if (e instanceof CsvImportError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  try {
    if (dryRun) {
      const plan = await planImport(prisma, id, csvText)
      return NextResponse.json({ plan })
    }
    const result = await executeImport(prisma, id, csvText)
    return NextResponse.json({ result })
  } catch (e) {
    if (e instanceof CsvImportError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('資材CSVインポートエラー:', e)
    return NextResponse.json({ error: 'インポートに失敗しました' }, { status: 500 })
  }
}

async function readCsv(request: Request): Promise<string> {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new CsvImportError('CSV ファイルを添付してください')
    }
    if (file.size === 0) {
      throw new CsvImportError('空のファイルです')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new CsvImportError(`ファイルサイズが ${MAX_FILE_BYTES / 1024 / 1024}MB を超えています`)
    }
    return await file.text()
  }
  const text = await request.text()
  if (text.length > MAX_FILE_BYTES) {
    throw new CsvImportError(`ファイルサイズが ${MAX_FILE_BYTES / 1024 / 1024}MB を超えています`)
  }
  if (text.length === 0) {
    throw new CsvImportError('CSV データがありません')
  }
  return text
}
