'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sparkles, AlertTriangle, Clock } from 'lucide-react'
import { getTrialStatus } from '@/lib/trial'

// トライアル中であることをユーザーに常時知らせるバナー。
// Header と同じ可視条件（未認証画面・SUPER_ADMIN・ログイン画面では非表示）。
// 期限切れに到達したケースは middleware が force-signout するので通常は描画されないが、
// JWT が古い場合の保険として描画はサポートする。
export default function TrialBanner() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const segments = pathname.split('/').filter(Boolean)
  const isTenantLoginPage =
    segments.length === 1 && segments[0] !== 'super-admin' && segments[0] !== 'super-admin-login'
  if (
    pathname === '/' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/super-admin') ||
    isTenantLoginPage
  ) {
    return null
  }

  if (!session?.user) return null

  const status = getTrialStatus(session.user.tenantTrialEndsAt)
  if (status.kind === 'NOT_TRIAL') return null

  if (status.kind === 'EXPIRED') {
    return (
      <div className="print:hidden bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-800 font-medium">
            無料トライアル期限が切れています。引き続きご利用いただくには管理者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  const urgent = status.daysLeft <= 3
  const warn = !urgent && status.daysLeft <= 7

  return (
    <div
      className={`print:hidden border-b ${
        urgent
          ? 'bg-red-50 border-red-200'
          : warn
            ? 'bg-amber-50 border-amber-200'
            : 'bg-accent-soft border-accent/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
        {urgent ? (
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        ) : warn ? (
          <Clock className="h-4 w-4 text-amber-700 flex-shrink-0" />
        ) : (
          <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
        )}
        <p
          className={`text-xs sm:text-sm font-medium ${
            urgent ? 'text-red-800' : warn ? 'text-amber-900' : 'text-foreground'
          }`}
        >
          無料トライアル中・残り{' '}
          <span className="font-bold tabular-nums">{status.daysLeft}</span> 日
          <span
            className={`ml-2 hidden sm:inline font-normal ${
              urgent ? 'text-red-700' : warn ? 'text-amber-800' : 'text-muted'
            }`}
          >
            期限を過ぎるとログインできなくなります。導入決定の際は管理者にご連絡ください。
          </span>
        </p>
      </div>
    </div>
  )
}
