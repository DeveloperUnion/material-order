import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Building2, Users, FileText, Plus, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/tenant/prisma'

export default async function SuperAdminDashboardPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalTenants, activeTenants, totalUsers, ordersThisMonth, recentTenants] =
    await Promise.all([
      prisma.tenant.count({ where: { isSystem: false } }),
      prisma.tenant.count({ where: { isSystem: false, isActive: true } }),
      prisma.user.count({ where: { tenant: { isSystem: false } } }),
      prisma.order.count({
        where: {
          tenant: { isSystem: false },
          createdAt: { gte: monthStart },
        },
      }),
      prisma.tenant.findMany({
        where: { isSystem: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { users: true } } },
      }),
    ])

  const stats = [
    { label: 'テナント総数', value: totalTenants, sub: `有効: ${activeTenants}`, icon: Building2 },
    { label: 'ユーザー総数', value: totalUsers, sub: '全テナント合算', icon: Users },
    { label: '今月の発注', value: ordersThisMonth, sub: format(monthStart, 'yyyy年M月', { locale: ja }), icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted mt-1">テナント・ユーザー・発注の概況</p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新規テナント
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
                  {value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-subtle">{sub}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center">
                <Icon className="h-5 w-5 text-accent" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">最近のテナント</h2>
          <Link
            href="/super-admin/tenants"
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            すべて見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentTenants.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            まだテナントが作成されていません
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentTenants.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/super-admin/tenants/${t.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted mt-0.5 font-mono tabular-nums">
                      作成 {format(t.createdAt, 'yyyy/MM/dd', { locale: ja })} ・ ユーザー {t._count.users} / {t.maxUsers}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      t.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-surface-muted text-muted border border-border'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-subtle'}`} />
                    {t.isActive ? '有効' : '無効'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
