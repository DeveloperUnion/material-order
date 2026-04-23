'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Building2, LogOut, ShieldCheck } from 'lucide-react'

export default function SuperAdminNav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/super-admin', label: 'ダッシュボード', icon: LayoutDashboard, exact: true },
    { href: '/super-admin/tenants', label: 'テナント', icon: Building2, exact: false },
  ]

  return (
    <header className="print:hidden bg-surface border-b border-border safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 safe-x">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-6">
            <Link
              href="/super-admin"
              className="flex items-center gap-2 font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
            >
              <ShieldCheck className="h-5 w-5 text-accent" />
              <span className="text-sm sm:text-base">Super Admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {links.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-surface-muted text-foreground'
                        : 'text-muted hover:text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted font-medium truncate max-w-[10rem]">
              {userName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-border bg-surface text-foreground text-xs sm:text-sm font-medium hover:bg-surface-muted hover:border-border-strong transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>

        <nav className="flex sm:hidden items-center gap-1 pb-2">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-surface-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
