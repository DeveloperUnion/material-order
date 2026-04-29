'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { LogOut, User } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useTenant } from '@/lib/tenant/context'
import { useTenantPath } from '@/lib/tenant/links'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { config } = useTenant()
  const t = useTenantPath()

  // 未認証系ページ・SUPER_ADMIN 専用画面では通常ヘッダーを描画しない。
  // /[tenantCode] のログイン画面 (テナントコード単独) も非表示にする。
  const segments = pathname.split('/').filter(Boolean)
  const isTenantLoginPage = segments.length === 1 && segments[0] !== 'super-admin' && segments[0] !== 'super-admin-login'
  if (
    pathname === '/' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/super-admin') ||
    isTenantLoginPage
  )
    return null

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const handleLogoClick = () => {
    router.push(t('/dashboard'))
  }

  return (
    <header className="print:hidden bg-surface border-b border-border safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 safe-x">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 hover:opacity-75 transition-opacity flex-shrink-0"
          >
            <Image
              src={config.icon}
              alt={config.title}
              width={486}
              height={823}
              priority
              className="h-12 sm:h-14 w-auto"
            />
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-cyan-500">
              発注
              <span className="text-xs sm:text-sm font-medium ml-1">for 足場</span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {session?.user && (
              <button
                type="button"
                onClick={() => router.push(t('/profile'))}
                className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full text-sm text-foreground hover:bg-surface-muted transition-colors"
              >
                <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-accent" strokeWidth={2} />
                </div>
                <span className="font-medium hidden sm:inline max-w-[10rem] truncate">
                  {session.user.name}
                </span>
              </button>
            )}
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
      </div>
    </header>
  )
}
