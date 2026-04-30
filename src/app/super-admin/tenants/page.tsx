import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Building2, Plus, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/tenant/prisma'
import { getTrialStatus } from '@/lib/trial'

export default async function TenantsListPage() {
  const tenants = await prisma.tenant.findMany({
    where: { isSystem: false },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, orders: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">テナント</h1>
          <p className="text-sm text-muted mt-1">全 {tenants.length} 件</p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新規テナント
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl px-5 py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
            <Building2 className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">まだテナントがありません</p>
          <p className="text-xs text-muted mb-4">「新規テナント」から最初の顧客を追加してください</p>
          <Link
            href="/super-admin/tenants/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            新規テナント
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl divide-y divide-border">
          {tenants.map((t) => {
            const trial = getTrialStatus(t.trialEndsAt)
            return (
            <Link
              key={t.id}
              href={`/super-admin/tenants/${t.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-muted transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                      t.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-surface-muted text-muted border border-border'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-subtle'}`} />
                    {t.isActive ? '有効' : '無効'}
                  </span>
                  {trial.kind === 'ACTIVE' && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 border ${
                        trial.daysLeft <= 3
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : trial.daysLeft <= 7
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-accent-soft text-accent border-accent/20'
                      }`}
                    >
                      トライアル 残り{trial.daysLeft}日
                    </span>
                  )}
                  {trial.kind === 'EXPIRED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 bg-red-50 text-red-700 border border-red-200">
                      トライアル期限切れ
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted font-mono tabular-nums">
                  <span>
                    ユーザー <span className="text-foreground font-semibold">{t._count.users}</span> / {t.maxUsers}
                  </span>
                  <span>
                    発注 <span className="text-foreground font-semibold">{t._count.orders}</span>
                  </span>
                  <span>作成 {format(t.createdAt, 'yyyy/MM/dd', { locale: ja })}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-subtle flex-shrink-0" />
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
