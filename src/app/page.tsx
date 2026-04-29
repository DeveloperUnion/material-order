'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'
import { defaultAppConfig } from '@/lib/tenant/config'

const STORAGE_KEY = 'material-order:last-tenant-code'

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [tenantCode, setTenantCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const dest =
        session.user.role === 'SUPER_ADMIN'
          ? '/super-admin'
          : `/${session.user.tenantCode}/dashboard`
      router.replace(dest)
      return
    }
    if (status === 'unauthenticated') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTenantCode(saved)
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = tenantCode.trim().toLowerCase()
    if (!code) {
      setError('会社コードを入力してください')
      return
    }
    setLoading(true)
    try {
      // 存在確認は /[tenantCode] 側の layout が行う(無効なら 404)。
      // 直接遷移して、404 ならそこで止まるシンプルな方針にする。
      try {
        localStorage.setItem(STORAGE_KEY, code)
      } catch {
        // localStorage が使えない環境は無視
      }
      router.push(`/${code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-background pt-16 sm:pt-24 px-4 pb-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src={defaultAppConfig.icon}
            alt={defaultAppConfig.title}
            width={486}
            height={823}
            priority
            className="mx-auto h-16 sm:h-20 w-auto"
          />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-xs font-medium text-muted mb-2">
                会社コード
              </label>
              <input
                id="code"
                type="text"
                required
                autoFocus
                autoComplete="organization"
                inputMode="text"
                spellCheck={false}
                placeholder="例: oken"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm font-mono placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              />
              <p className="mt-2 text-xs text-subtle">
                ご利用の会社から発行されたコードを入力してください
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>{loading ? '確認中...' : '次へ'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">
          UNION
        </p>
      </div>
    </div>
  )
}
