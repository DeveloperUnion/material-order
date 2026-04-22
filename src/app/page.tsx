'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn, getSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'
import { defaultAppConfig } from '@/lib/tenant/config'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }

      const session = await getSession()
      window.location.href = session?.user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-background pt-16 sm:pt-24 px-4">
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

        <form
          onSubmit={handleLogin}
          className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-muted mb-2"
            >
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.co.jp"
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted mb-2"
            >
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
            <span>{loading ? 'ログイン中...' : 'ログイン'}</span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">
          UNION
        </p>
      </div>
    </div>
  )
}
