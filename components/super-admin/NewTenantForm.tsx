'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

type AuthMode = 'EMAIL' | 'NAME'

export default function NewTenantForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [tenantCode, setTenantCode] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [maxUsers, setMaxUsers] = useState(10)
  const [authMode, setAuthMode] = useState<AuthMode>('EMAIL')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          tenantCode: tenantCode.trim().toLowerCase(),
          adminEmail: adminEmail.trim(),
          adminName: adminName.trim() || '管理者',
          maxUsers,
          authMode,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `作成に失敗しました (${res.status})`)
      }
      const data = await res.json()
      router.push(`/super-admin/tenants/${data.tenant.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-6 sm:p-7 space-y-5"
    >
      <Field label="会社名" required>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="株式会社〇〇"
          autoComplete="organization"
          className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
        />
      </Field>

      <Field
        label="会社コード"
        required
        hint="ログイン時に入力する短いコード（例: oken）。英小文字・数字・ハイフン、3〜64 文字"
      >
        <input
          type="text"
          required
          value={tenantCode}
          onChange={(e) => setTenantCode(e.target.value.toLowerCase())}
          placeholder="oken"
          autoComplete="off"
          spellCheck={false}
          pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
          className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface font-mono placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
        />
      </Field>

      <Field label="認証方式" required hint="現場メンバーが email を持たない場合は「名前」を選択">
        <div className="flex gap-2">
          <AuthModeOption
            current={authMode}
            value="EMAIL"
            label="メール"
            description="email + password"
            onSelect={setAuthMode}
          />
          <AuthModeOption
            current={authMode}
            value="NAME"
            label="名前"
            description="名前選択 + password"
            onSelect={setAuthMode}
          />
        </div>
      </Field>

      <Field label="管理者メールアドレス" required hint="招待リンクをこのアドレスに送信します">
        <input
          type="email"
          required
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="admin@example.com"
          autoComplete="email"
          inputMode="email"
          className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
        />
      </Field>

      <Field label="管理者名" hint="空欄なら「管理者」">
        <input
          type="text"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="山田太郎"
          autoComplete="name"
          className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
        />
      </Field>

      <Field label="最大ユーザー数" required>
        <input
          type="number"
          required
          inputMode="numeric"
          min={1}
          max={999}
          value={maxUsers}
          onChange={(e) => setMaxUsers(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface font-mono tabular-nums focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
        />
      </Field>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push('/super-admin/tenants')}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '作成中...' : '作成 + 招待メール送信'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  )
}

function AuthModeOption({
  current,
  value,
  label,
  description,
  onSelect,
}: {
  current: AuthMode
  value: AuthMode
  label: string
  description: string
  onSelect: (v: AuthMode) => void
}) {
  const selected = current === value
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 px-3 py-2.5 text-left border rounded-md transition-all ${
        selected
          ? 'border-accent bg-accent-soft ring-4 ring-accent/15'
          : 'border-border bg-surface hover:bg-surface-muted'
      }`}
    >
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-[11px] text-muted">{description}</div>
    </button>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  )
}
