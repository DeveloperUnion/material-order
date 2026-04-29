'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { signIn, getSession } from 'next-auth/react'
import { ArrowRight, ArrowLeft, Check, User as UserIcon } from 'lucide-react'
import { defaultAppConfig } from '@/lib/tenant/config'

type Step = 'code' | 'confirm' | 'user' | 'password'
type AuthMode = 'EMAIL' | 'NAME'

interface TenantInfo {
  id: string
  name: string
  authMode: AuthMode
}

interface MemberUser {
  id: string
  name: string
  hasPassword: boolean
  canSetupPassword: boolean
}

const STORAGE_KEY = 'material-order:tenant-code'

export default function Home() {
  const [step, setStep] = useState<Step>('code')
  const [tenantCode, setTenantCode] = useState('')
  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  const [members, setMembers] = useState<MemberUser[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberUser | null>(null)
  const [memberSearch, setMemberSearch] = useState('')

  const [email, setEmail] = useState('')
  // EMAIL モードで「初回 PW 設定 / 再発行後の再設定」が必要かのフラグ
  const [emailNeedsSetup, setEmailNeedsSetup] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 起動時に localStorage からコードを読み出して、確認ステップに進める
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    setTenantCode(saved)
    setLoading(true)
    fetch(`/api/tenant/lookup?code=${encodeURIComponent(saved)}`)
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem(STORAGE_KEY)
          return
        }
        const data = await res.json()
        setTenant(data.tenant)
        setStep('confirm')
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => setLoading(false))
  }, [])

  const lookupTenant = async (code: string): Promise<TenantInfo | null> => {
    const res = await fetch(`/api/tenant/lookup?code=${encodeURIComponent(code)}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '会社コードが見つかりません')
    }
    const data = await res.json()
    return data.tenant as TenantInfo
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = tenantCode.trim().toLowerCase()
    if (!code) {
      setError('会社コードを入力してください')
      return
    }
    setLoading(true)
    try {
      const t = await lookupTenant(code)
      if (!t) throw new Error('会社コードが見つかりません')
      setTenant(t)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmTenant = async () => {
    if (!tenant) return
    localStorage.setItem(STORAGE_KEY, tenantCode.trim().toLowerCase())
    setError(null)

    if (tenant.authMode === 'NAME') {
      setLoading(true)
      try {
        const res = await fetch(`/api/tenant/${tenant.id}/users`)
        if (!res.ok) throw new Error('メンバー一覧の取得に失敗しました')
        const data = await res.json()
        setMembers(data.users)
        setStep('user')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      } finally {
        setLoading(false)
      }
    } else {
      setStep('user')
    }
  }

  const handleChangeTenant = () => {
    localStorage.removeItem(STORAGE_KEY)
    setTenant(null)
    setMembers([])
    setSelectedMember(null)
    setEmail('')
    setPassword('')
    setError(null)
    setStep('code')
  }

  const handleSelectMember = (member: MemberUser) => {
    setSelectedMember(member)
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setStep('password')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailNeedsSetup(false)
    if (!email.trim() || !tenant) {
      setError('メールアドレスを入力してください')
      return
    }
    setLoading(true)
    try {
      // 初回 PW 設定 / 再発行待ちかをサーバに問い合わせる（プライバシー上、true / false しか返らない）
      const res = await fetch(`/api/tenant/${tenant.id}/email-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json().catch(() => ({ requiresSetup: false }))
      setEmailNeedsSetup(!!data.requiresSetup)
      setPassword('')
      setConfirmPassword('')
      setStep('password')
    } catch {
      // 失敗時は通常ログイン UI に倒す（誤入力ならログイン側でエラーになる）
      setEmailNeedsSetup(false)
      setStep('password')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!tenant) return
    setLoading(true)

    try {
      if (tenant.authMode === 'NAME') {
        if (!selectedMember) throw new Error('ユーザーが選択されていません')

        // 初回 PW 設定 / 再発行後の再設定
        if (!selectedMember.hasPassword) {
          if (!selectedMember.canSetupPassword) {
            throw new Error('パスワード設定の有効期限が切れています。管理者に再発行を依頼してください')
          }
          if (password.length < 8) {
            throw new Error('パスワードは8文字以上で入力してください')
          }
          if (password !== confirmPassword) {
            throw new Error('パスワードが一致しません')
          }
          const setupRes = await fetch('/api/auth/setup-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tenant.id,
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
          tenantId: tenant.id,
          name: selectedMember.name,
          password,
          redirect: false,
        })
        if (result?.error) {
          throw new Error('パスワードが正しくありません')
        }
      } else {
        // EMAIL モード。初回 PW 設定 / 再発行後の再設定が必要なら setup-password を先に叩く
        if (emailNeedsSetup) {
          if (password.length < 8) {
            throw new Error('パスワードは8文字以上で入力してください')
          }
          if (password !== confirmPassword) {
            throw new Error('パスワードが一致しません')
          }
          const setupRes = await fetch('/api/auth/setup-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tenant.id,
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
          email,
          password,
          redirect: false,
        })
        if (result?.error) {
          throw new Error('メールアドレスまたはパスワードが正しくありません')
        }
      }

      const session = await getSession()
      window.location.href =
        session?.user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => m.name.includes(memberSearch.trim()))
    : members

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
          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-5">
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

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>{loading ? '確認中...' : '次へ'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {step === 'confirm' && tenant && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-xs text-muted mb-2">この会社で間違いありませんか？</p>
                <p className="text-lg font-bold text-foreground">{tenant.name}</p>
                <p className="mt-1 text-xs text-subtle font-mono">
                  コード: {tenantCode.toLowerCase()}
                </p>
              </div>

              {error && <ErrorBox message={error} />}

              <button
                type="button"
                onClick={handleConfirmTenant}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>{loading ? '読み込み中...' : 'この会社でログインする'}</span>
              </button>
              <button
                type="button"
                onClick={handleChangeTenant}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                別の会社コードを入力
              </button>
            </div>
          )}

          {step === 'user' && tenant?.authMode === 'NAME' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted mb-1">{tenant.name}</p>
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

              {error && <ErrorBox message={error} />}

              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto -mx-1 px-1">
                {filteredMembers.length === 0 ? (
                  <p className="col-span-2 text-center text-sm text-muted py-8">
                    メンバーが見つかりません
                  </p>
                ) : (
                  filteredMembers.map((m) => {
                    const expired = !m.hasPassword && !m.canSetupPassword
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => !expired && handleSelectMember(m)}
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
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.name}
                          </p>
                          {!m.hasPassword && !expired && (
                            <p className="text-[10px] text-amber-700 font-medium">
                              初回ログイン
                            </p>
                          )}
                          {expired && (
                            <p className="text-[10px] text-red-700 font-medium">
                              管理者に再発行依頼
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              <button
                type="button"
                onClick={handleChangeTenant}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                会社を変更
              </button>
            </div>
          )}

          {step === 'user' && tenant?.authMode === 'EMAIL' && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <p className="text-xs text-muted mb-1">{tenant.name}</p>
                <h2 className="text-base font-semibold text-foreground tracking-tight mb-4">
                  メールアドレス
                </h2>
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

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
              >
                <span>次へ</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleChangeTenant}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                会社を変更
              </button>
            </form>
          )}

          {step === 'password' && tenant && (() => {
            const needsSetup =
              tenant.authMode === 'NAME'
                ? !!selectedMember && !selectedMember.hasPassword
                : emailNeedsSetup
            return (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted truncate">{tenant.name}</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {tenant.authMode === 'NAME' ? selectedMember?.name : email}
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
                    パスワード（確認）
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
                  setError(null)
                  setPassword('')
                  setConfirmPassword('')
                  setStep('user')
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                {tenant.authMode === 'NAME' ? '別のメンバーを選ぶ' : 'メールアドレスを変更'}
              </button>
            </form>
            )
          })()}
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">
          UNION
        </p>
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
