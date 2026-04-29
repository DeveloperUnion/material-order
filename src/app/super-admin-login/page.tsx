'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'

// SUPER_ADMIN 用のシンプルな email + password ログイン画面。
// 通常ユーザーが使う `/` の会社コード入力フローとは独立。
// URL 直打ち想定で、`/` からはリンクしない。
export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }
      const session = await getSession()
      if (session?.user?.role !== 'SUPER_ADMIN') {
        setError('SUPER_ADMIN としてログインできませんでした')
        return
      }
      window.location.href = '/super-admin'
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
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
            System Administrator
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-muted mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-muted mb-2">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
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
      </div>
    </div>
  )
}
