import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { prisma } from '@/lib/tenant/prisma'
import TenantActions from '@/components/super-admin/TenantActions'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      invitations: {
        where: { usedAt: null },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      _count: { select: { orders: true, materials: true } },
    },
  })

  if (!tenant || tenant.isSystem) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-muted mt-1 font-mono tabular-nums">
              ID: {tenant.id} ・ 作成 {format(tenant.createdAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
            </p>
          </div>
        </div>
      </div>

      <section className="bg-accent-soft border border-accent/20 rounded-xl px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
          ログイン情報
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-muted">会社コード</p>
            <p className="text-base font-mono font-semibold text-foreground">{tenant.code}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">認証方式</p>
            <p className="text-base font-semibold text-foreground">
              {tenant.authMode === 'NAME' ? '名前選択 (NAME)' : 'メール (EMAIL)'}
            </p>
          </div>
        </div>
      </section>

      <TenantActions
        tenantId={tenant.id}
        tenantName={tenant.name}
        initialMaxUsers={tenant.maxUsers}
        initialIsActive={tenant.isActive}
        initialTrialEndsAt={tenant.trialEndsAt ? tenant.trialEndsAt.toISOString() : null}
        userCount={tenant.users.length}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="ユーザー" value={`${tenant.users.length} / ${tenant.maxUsers}`} />
        <StatCard label="未使用の招待" value={tenant.invitations.length.toString()} />
        <StatCard label="発注 / 資材" value={`${tenant._count.orders} / ${tenant._count.materials}`} />
      </div>

      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">資材CSVインポート</p>
          <p className="text-xs text-muted mt-1">
            CSV ファイルから資材を一括登録・更新します。
          </p>
        </div>
        <Link
          href={`/super-admin/tenants/${tenant.id}/materials/import`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          資材を CSV インポート
        </Link>
      </section>

      <section className="bg-surface border border-border rounded-xl">
        <h2 className="px-5 py-4 text-sm font-semibold text-foreground border-b border-border">
          メンバー（{tenant.users.length}）
        </h2>
        {tenant.users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">メンバーがいません</div>
        ) : (
          <ul className="divide-y divide-border">
            {tenant.users.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.name}
                    {u.email && (
                      <span className="ml-2 text-xs font-mono text-muted">{u.email}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5 font-mono tabular-nums">
                    {u.role} ・ {u.isActive ? '有効' : '無効'}
                    {u.lastLoginAt
                      ? ` ・ 最終ログイン ${format(u.lastLoginAt, 'yyyy/MM/dd', { locale: ja })}`
                      : ' ・ 未ログイン'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tenant.invitations.length > 0 && (
        <section className="bg-surface border border-border rounded-xl">
          <h2 className="px-5 py-4 text-sm font-semibold text-foreground border-b border-border">
            未使用の招待（{tenant.invitations.length}）
          </h2>
          <ul className="divide-y divide-border">
            {tenant.invitations.map((inv) => (
              <li key={inv.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                  <p className="text-xs text-muted mt-0.5 font-mono tabular-nums">
                    {inv.role} ・ 有効期限 {format(inv.expiresAt, 'yyyy/MM/dd', { locale: ja })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs font-mono uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold font-mono tabular-nums text-foreground">{value}</p>
    </div>
  )
}
