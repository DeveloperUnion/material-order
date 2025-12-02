'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/tenant/context'
// import Image from 'next/image'

export default function Home() {
  const { config } = useTenant()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました')
        return
      }

      // ログイン成功時は window.location でリダイレクト
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('userName', username)
      window.location.href = '/dashboard'
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-slate-50 to-slate-100 pt-20">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">
            {config.appConfig.appTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            ログインしてください
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-xl" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                ユーザーID
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 hover:border-slate-300"
                placeholder="ユーザーID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 hover:border-slate-300"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-600 font-medium">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}