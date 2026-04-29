import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/tenant/prisma'
import MaterialsCsvImport from '@/components/super-admin/MaterialsCsvImport'

export default async function MaterialsImportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      authMode: true,
      isSystem: true,
      _count: { select: { materials: true } },
    },
  })

  if (!tenant || tenant.isSystem) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/super-admin/tenants/${tenant.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          テナント詳細に戻る
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          資材CSVインポート
        </h1>
        <p className="text-sm text-muted mt-1">
          CSV ファイルから資材を一括登録・更新します。
        </p>
      </div>

      <section className="bg-accent-soft border border-accent/20 rounded-xl px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
          投入先テナント
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] text-muted">会社名</p>
            <p className="text-base font-semibold text-foreground">{tenant.name}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">会社コード</p>
            <p className="text-base font-mono font-semibold text-foreground">{tenant.code}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">既存資材数</p>
            <p className="text-base font-mono font-semibold text-foreground tabular-nums">
              {tenant._count.materials}
            </p>
          </div>
        </div>
      </section>

      <MaterialsCsvImport tenantId={tenant.id} tenantName={tenant.name} />
    </div>
  )
}
