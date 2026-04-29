'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn, getSession } from 'next-auth/react'
import { ArrowRight, ArrowLeft, User as UserIcon } from 'lucide-react'
import { defaultAppConfig } from '@/lib/tenant/config'

export interface MemberUser {
  id: string
  name: string
  hasPassword: boolean
  canSetupPassword: boolean
}

interface Props {
  tenantId: string
  tenantCode: string
  tenantName: string
  authMode: 'EMAIL' | 'NAME'
  members: MemberUser[]
}

export function LoginForm(props: Props) {
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
          {props.authMode === 'EMAIL' ? <EmailLogin {...props} /> : <NameLogin {...props} />}
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">
          UNION
        </p>
      </div>
    </div>
  )
}

function EmailLogin({ tenantId, tenantCode, tenantName }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }
    setLoading(true)
    try {
      if (needsSetup) {
        // PW 設定モード
        if (password.length < 8) throw new Error('パスワードは8文字以上で入力してください')
        if (password !== confirmPassword) throw new Error('パスワードが一致しません')

        const setupRes = await fetch('/api/auth/setup-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            email: email.trim().toLowerCase(),
            password,
          }),
        })
        if (!setupRes.ok) {
          const data = await setupRes.json().catch(() => ({}))
          throw new Error(data.error || 'パスワード設定に失敗しました')
        }
      }

      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        // signIn 失敗 → リセット待ちかを判定
        const statusRes = await fetch(`/api/tenant/${tenantId}/email-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        })
        const statusData = await statusRes.json().catch(() => ({ requiresSetup: false }))
        if (statusData.requiresSetup) {
          setNeedsSetup(true)
          setPassword('')
          setConfirmPassword('')
          setError('パスワードが未設定です。新しいパスワードを設定してください。')
          setLoading(false)
          return
        }
        throw new Error('メールアドレスまたはパスワードが正しくありません')
      }

      const session = await getSession()
      window.location.href =
        session?.user?.role === 'SUPER_ADMIN' ? '/super-admin' : `/${tenantCode}/dashboard`
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs text-muted mb-1">{tenantName}</p>
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          ログイン
        </h2>
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted mb-2">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="name@company.co.jp"
          className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-muted mb-2">
          {needsSetup ? '新しいパスワード' : 'パスワード'}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete={needsSetup ? 'new-password' : 'current-password'}
          placeholder={needsSetup ? '8文字以上' : '••••••••'}
          className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {needsSetup && (
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-muted mb-2">
            パスワード(確認)
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="再入力"
            className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      )}

      {error && <ErrorBox message={error} />}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span>
          {loading
            ? 'ログイン中...'
            : needsSetup
              ? 'パスワードを設定してログイン'
              : 'ログイン'}
        </span>
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  )
}

function NameLogin({ tenantId, tenantCode, tenantName, members }: Props) {
  const [selectedMember, setSelectedMember] = useState<MemberUser | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = memberSearch.trim()
    ? members.filter((m) => m.name.includes(memberSearch.trim()))
    : members

  const needsSetup = !!selectedMember && !selectedMember.hasPassword

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedMember) return
    setLoading(true)
    try {
      if (needsSetup) {
        if (!selectedMember.canSetupPassword) {
          throw new Error('パスワード設定の有効期限が切れています。管理者に再発行を依頼してください')
        }
        if (password.length < 8) throw new Error('パスワードは8文字以上で入力してください')
        if (password !== confirmPassword) throw new Error('パスワードが一致しません')

        const setupRes = await fetch('/api/auth/setup-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            userId: selectedMember.id,
            password,
          }),
        })
        if (!setupRes.ok) {
          const data = await setupRes.json().catch(() => ({}))
          throw new Error(data.error || 'パスワード設定に失敗しました')
        }
      }

      const result = await signIn('credentials', {
        tenantId,
        name: selectedMember.name,
        password,
        redirect: false,
      })
      if (result?.error) throw new Error('パスワードが正しくありません')

      window.location.href = `/${tenantCode}/dashboard`
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  if (selectedMember) {
    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted truncate">{tenantName}</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {selectedMember.name}
            </p>
          </div>
        </div>

        {needsSetup && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            パスワードが未設定です。新しいパスワードを設定してください。
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-muted mb-2">
            {needsSetup ? '新しいパスワード' : 'パスワード'}
          </label>
          <input
            id="password"
            type="password"
            required
            autoFocus
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
            placeholder={needsSetup ? '8文字以上' : '••••••••'}
            className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {needsSetup && (
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-muted mb-2">
              パスワード(確認)
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="再入力"
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span>
            {loading
              ? 'ログイン中...'
              : needsSetup
                ? 'パスワードを設定してログイン'
                : 'ログイン'}
          </span>
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMember(null)
            setPassword('')
            setConfirmPassword('')
            setError(null)
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          別のメンバーを選ぶ
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted mb-1">{tenantName}</p>
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          あなたのお名前を選択
        </h2>
      </div>

      {members.length > 8 && (
        <input
          type="text"
          placeholder="名前で検索"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none"
        />
      )}

      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <p className="col-span-2 text-center text-sm text-muted py-8">
            メンバーが見つかりません
          </p>
        ) : (
          filtered.map((m) => {
            const expired = !m.hasPassword && !m.canSetupPassword
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !expired && setSelectedMember(m)}
                disabled={expired}
                title={expired ? '管理者にパスワード再発行を依頼してください' : undefined}
                className={`flex items-center gap-2 px-3 py-3 border rounded-lg text-left transition-all ${
                  expired
                    ? 'border-border bg-surface-muted opacity-60 cursor-not-allowed'
                    : 'border-border bg-surface hover:bg-surface-muted hover:border-accent'
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-surface-muted text-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  {!m.hasPassword && !expired && (
                    <p className="text-[10px] text-amber-700 font-medium">初回ログイン</p>
                  )}
                  {expired && (
                    <p className="text-[10px] text-red-700 font-medium">管理者に再発行依頼</p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
      <div className="text-sm text-red-700">{message}</div>
    </div>
  )
}
