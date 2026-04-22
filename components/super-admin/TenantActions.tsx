'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function TenantActions({
  tenantId,
  tenantName,
  initialMaxUsers,
  initialIsActive,
  userCount,
}: {
  tenantId: string
  tenantName: string
  initialMaxUsers: number
  initialIsActive: boolean
  userCount: number
}) {
  const router = useRouter()
  const [maxUsers, setMaxUsers] = useState(initialMaxUsers)
  const [isActive, setIsActive] = useState(initialIsActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty = maxUsers !== initialMaxUsers || isActive !== initialIsActive

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
  )
}
