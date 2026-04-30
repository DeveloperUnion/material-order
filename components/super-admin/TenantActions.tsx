'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save, Sparkles, ShieldCheck, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getTrialStatus } from '@/lib/trial'

export default function TenantActions({
  tenantId,
  tenantName,
  initialMaxUsers,
  initialIsActive,
  initialTrialEndsAt,
  userCount,
}: {
  tenantId: string
  tenantName: string
  initialMaxUsers: number
  initialIsActive: boolean
  initialTrialEndsAt: string | null
  userCount: number
}) {
  const router = useRouter()
  const [maxUsers, setMaxUsers] = useState(initialMaxUsers)
  const [isActive, setIsActive] = useState(initialIsActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [trialBusy, setTrialBusy] = useState(false)
  const [extendDays, setExtendDays] = useState(30)

  const trialStatus = getTrialStatus(initialTrialEndsAt)

  const dirty = maxUsers !== initialMaxUsers || isActive !== initialIsActive

  const trialAction = async (action: 'convert-to-paid' | 'extend', extend?: number) => {
    setTrialBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialAction: action,
          ...(action === 'extend' ? { extendDays: extend ?? 30 } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '更新に失敗しました')
      }
      setConvertOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー')
    } finally {
      setTrialBusy(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUsers, isActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '更新に失敗しました')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '削除に失敗しました')
      }
      router.push('/super-admin/tenants')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <TrialPanel
        status={trialStatus}
        busy={trialBusy}
        extendDays={extendDays}
        onChangeExtendDays={setExtendDays}
        onConvert={() => setConvertOpen(true)}
        onExtend={() => trialAction('extend', extendDays)}
      />

    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">最大ユーザー数</label>
          <input
            type="number"
            inputMode="numeric"
            min={Math.max(1, userCount)}
            max={999}
            value={maxUsers}
            onChange={(e) => setMaxUsers(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md bg-surface font-mono tabular-nums focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
          />
          <p className="mt-1 text-xs text-subtle">現在のメンバー: {userCount} 人</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">ステータス</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                isActive ? 'bg-emerald-500' : 'bg-subtle'
              }`}
              role="switch"
              aria-checked={isActive}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-foreground">{isActive ? '有効' : '無効'}</span>
          </div>
          <p className="mt-1 text-xs text-subtle">無効化するとメンバーはログイン不可</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={saving || deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          テナントを削除
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? '保存中...' : '変更を保存'}
        </button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">テナントを削除</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              「<span className="font-semibold">{tenantName}</span>」とすべてのメンバー・発注・資材・カテゴリ・招待を削除します。
            </p>
            <p className="text-xs text-red-700 font-medium">
              この操作は元に戻せません。
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={del}
              className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? '削除中...' : '削除する'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">本契約に切り替え</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              「<span className="font-semibold">{tenantName}</span>」の無料トライアルを終了し、本契約に切り替えます。
            </p>
            <p className="text-xs text-muted">
              既存のユーザー・発注・資材はそのまま継続されます。期限切れ自動無効化は無効になります。
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={trialBusy}
              onClick={() => setConvertOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={trialBusy}
              onClick={() => trialAction('convert-to-paid')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="h-4 w-4" />
              {trialBusy ? '更新中...' : '本契約に切り替える'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TrialPanel({
  status,
  busy,
  extendDays,
  onChangeExtendDays,
  onConvert,
  onExtend,
}: {
  status: ReturnType<typeof getTrialStatus>
  busy: boolean
  extendDays: number
  onChangeExtendDays: (n: number) => void
  onConvert: () => void
  onExtend: () => void
}) {
  if (status.kind === 'NOT_TRIAL') {
    return (
      <div className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">本契約</p>
          <p className="text-xs text-muted mt-0.5">無料トライアル期限はありません</p>
        </div>
      </div>
    )
  }

  const expired = status.kind === 'EXPIRED'
  const urgent = !expired && status.kind === 'ACTIVE' && status.daysLeft <= 3

  return (
    <div
      className={`rounded-xl px-5 py-4 border ${
        expired
          ? 'bg-red-50 border-red-200'
          : urgent
            ? 'bg-amber-50 border-amber-200'
            : 'bg-accent-soft border-accent/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            expired ? 'bg-red-100' : urgent ? 'bg-amber-100' : 'bg-surface'
          }`}
        >
          {expired ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : urgent ? (
            <Clock className="h-4 w-4 text-amber-700" />
          ) : (
            <Sparkles className="h-4 w-4 text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`text-sm font-semibold ${
                expired ? 'text-red-800' : urgent ? 'text-amber-900' : 'text-foreground'
              }`}
            >
              {expired
                ? '無料トライアル期限切れ'
                : `無料トライアル中（残り ${status.daysLeft} 日）`}
            </p>
          </div>
          <p
            className={`text-xs mt-0.5 ${
              expired ? 'text-red-700' : urgent ? 'text-amber-800' : 'text-muted'
            }`}
          >
            {expired
              ? `期限: ${format(status.endsAt, 'yyyy/MM/dd HH:mm', { locale: ja })} に終了。テナントは自動的に無効化されています。`
              : `期限: ${format(status.endsAt, 'yyyy/MM/dd HH:mm', { locale: ja })}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted">延長 (日)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={extendDays}
            onChange={(e) => onChangeExtendDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
            className="w-20 px-2 py-1.5 text-sm text-foreground border border-border rounded-md bg-surface font-mono tabular-nums focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
          />
          <button
            type="button"
            disabled={busy}
            onClick={onExtend}
            className="px-3 py-1.5 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
          >
            期限を延長
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onConvert}
          className="sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ShieldCheck className="h-4 w-4" />
          本契約に切り替え
        </button>
      </div>
    </div>
  )
}
