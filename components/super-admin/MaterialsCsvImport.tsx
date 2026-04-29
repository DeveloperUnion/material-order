'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Download,
  FileText,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
} from 'lucide-react'

type ImportRowError = {
  row: number
  materialCode: string
  message: string
}

type ImportPlan = {
  total: number
  toCreate: number
  toUpdate: number
  autoCodes: number
  newCategories: number
  errors: ImportRowError[]
  newCategoryNames: string[]
  autoCodeRange: { from: string; to: string } | null
  skippedHeaders: string[]
}

type ImportResult = {
  created: number
  updated: number
  autoCodesAssigned: { row: number; code: string }[]
  newCategoryNames: string[]
  errors: ImportRowError[]
  skippedHeaders: string[]
}

type Step = 'upload' | 'preview' | 'done'

export default function MaterialsCsvImport({
  tenantId,
  tenantName,
}: {
  tenantId: string
  tenantName: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setPlan(null)
    setResult(null)
    setError(null)
    setStep('upload')
  }

  const submit = async (dryRun: boolean) => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `/api/super-admin/tenants/${tenantId}/materials/import${dryRun ? '?dryRun=1' : ''}`,
        { method: 'POST', body: fd },
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'インポートに失敗しました')
      }
      if (dryRun) {
        setPlan(data.plan as ImportPlan)
        setStep('preview')
      } else {
        setResult(data.result as ImportResult)
        setStep('done')
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'upload' && (
        <UploadStep
          tenantId={tenantId}
          file={file}
          setFile={setFile}
          loading={loading}
          onPreview={() => submit(true)}
        />
      )}

      {step === 'preview' && plan && (
        <PreviewStep
          plan={plan}
          file={file}
          loading={loading}
          onBack={reset}
          onExecute={() => submit(false)}
        />
      )}

      {step === 'done' && result && (
        <DoneStep
          result={result}
          tenantId={tenantId}
          tenantName={tenantName}
          onAgain={reset}
        />
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: '1. アップロード' },
    { key: 'preview', label: '2. プレビュー' },
    { key: 'done', label: '3. 完了' },
  ]
  const currentIdx = steps.findIndex((s) => s.key === step)
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full ${
              i === currentIdx
                ? 'bg-primary text-primary-foreground'
                : i < currentIdx
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface-muted text-muted'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-subtle">›</span>}
        </li>
      ))}
    </ol>
  )
}

function UploadStep({
  tenantId,
  file,
  setFile,
  loading,
  onPreview,
}: {
  tenantId: string
  file: File | null
  setFile: (f: File | null) => void
  loading: boolean
  onPreview: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          CSV フォーマット
        </h2>
        <ul className="text-xs text-muted space-y-1 mb-4 list-disc list-inside">
          <li>
            必須列: <code className="font-mono text-foreground">資材名</code>,{' '}
            <code className="font-mono text-foreground">重量(kg)</code>
          </li>
          <li>
            任意列: <code className="font-mono text-foreground">資材コード</code>,{' '}
            <code className="font-mono text-foreground">カテゴリ</code>,{' '}
            <code className="font-mono text-foreground">サイズ</code>
          </li>
          <li>
            <code className="font-mono text-foreground">資材コード</code> 空欄 → 自動生成
            (<code className="font-mono">M-NNN</code>)、新規作成扱い
          </li>
          <li>
            <code className="font-mono text-foreground">資材コード</code> 指定 → 既存と一致すれば更新、なければ新規作成
          </li>
          <li>カテゴリは名前が一致するものに紐付け、無ければ自動作成（末尾に追加）</li>
          <li>列の順番は問いません。ヘッダー名で識別します</li>
        </ul>
        <a
          href={`/api/super-admin/tenants/${tenantId}/materials/import/template`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          テンプレート CSV をダウンロード
        </a>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UploadCloud className="h-4 w-4" />
          ファイル選択
        </h2>
        <label className="block">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-border file:bg-surface file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted file:transition-colors"
          />
        </label>
        {file && (
          <p className="mt-3 text-xs text-muted font-mono tabular-nums">
            {file.name} ・ {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!file || loading}
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            プレビュー
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({
  plan,
  file,
  loading,
  onBack,
  onExecute,
}: {
  plan: ImportPlan
  file: File | null
  loading: boolean
  onBack: () => void
  onExecute: () => void
}) {
  const validRows = plan.toCreate + plan.toUpdate
  const hasErrors = plan.errors.length > 0
  const canExecute = validRows > 0

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-sm font-semibold text-foreground">プレビュー結果</h2>
          {file && (
            <p className="text-xs text-muted font-mono truncate">{file.name}</p>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="新規作成" value={plan.toCreate} tone="positive" />
          <Stat label="更新" value={plan.toUpdate} tone="info" />
          <Stat label="自動採番" value={plan.autoCodes} tone="muted" />
          <Stat label="エラー" value={plan.errors.length} tone={hasErrors ? 'negative' : 'muted'} />
        </div>

        {(plan.newCategoryNames.length > 0 ||
          plan.autoCodeRange ||
          plan.skippedHeaders.length > 0) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {plan.newCategoryNames.length > 0 && (
              <div className="rounded-lg bg-accent-soft border border-accent/20 px-3 py-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-accent mb-1">
                  新規カテゴリ ({plan.newCategoryNames.length})
                </p>
                <p className="text-foreground">{plan.newCategoryNames.join(', ')}</p>
              </div>
            )}
            {plan.autoCodeRange && (
              <div className="rounded-lg bg-surface-muted border border-border px-3 py-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
                  自動採番される資材コード
                </p>
                <p className="text-foreground font-mono">
                  {plan.autoCodeRange.from} 〜 {plan.autoCodeRange.to}
                </p>
              </div>
            )}
            {plan.skippedHeaders.length > 0 && (
              <div className="rounded-lg bg-surface-muted border border-border px-3 py-2 sm:col-span-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
                  CSV に無い列（更新時は既存値を維持）
                </p>
                <p className="text-foreground">{plan.skippedHeaders.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {hasErrors && (
        <div className="bg-surface border border-red-200 rounded-xl">
          <h3 className="px-5 py-3 text-sm font-semibold text-red-700 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            エラー行 ({plan.errors.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-mono uppercase tracking-wider text-muted">行</th>
                  <th className="px-4 py-2 text-left font-mono uppercase tracking-wider text-muted">資材コード</th>
                  <th className="px-4 py-2 text-left font-mono uppercase tracking-wider text-muted">理由</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plan.errors.map((err, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">{err.row}</td>
                    <td className="px-4 py-2 font-mono text-foreground">{err.materialCode || '—'}</td>
                    <td className="px-4 py-2 text-red-700">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-muted border-t border-border">
            エラー行はスキップされます。残り {validRows} 行のみがインポートされます。
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
        >
          やり直す
        </button>
        <button
          type="button"
          disabled={!canExecute || loading}
          onClick={onExecute}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {validRows} 行をインポート
        </button>
      </div>
    </div>
  )
}

function DoneStep({
  result,
  tenantId,
  tenantName,
  onAgain,
}: {
  result: ImportResult
  tenantId: string
  tenantName: string
  onAgain: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">インポート完了</p>
          <p className="text-xs text-emerald-700 mt-1">
            「{tenantName}」に新規 {result.created} 件、更新 {result.updated} 件を反映しました。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="新規作成" value={result.created} tone="positive" />
        <Stat label="更新" value={result.updated} tone="info" />
        <Stat label="自動採番" value={result.autoCodesAssigned.length} tone="muted" />
        <Stat label="新規カテゴリ" value={result.newCategoryNames.length} tone="muted" />
      </div>

      {result.autoCodesAssigned.length > 0 && (
        <div className="bg-surface border border-border rounded-xl">
          <h3 className="px-5 py-3 text-sm font-semibold text-foreground border-b border-border">
            自動採番された資材コード ({result.autoCodesAssigned.length})
          </h3>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-mono uppercase tracking-wider text-muted">行</th>
                  <th className="px-4 py-2 text-left font-mono uppercase tracking-wider text-muted">付与コード</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.autoCodesAssigned.map((a) => (
                  <tr key={a.row}>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">{a.row}</td>
                    <td className="px-4 py-2 font-mono text-foreground">{a.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
        >
          続けてインポート
        </button>
        <Link
          href={`/super-admin/tenants/${tenantId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          テナント詳細に戻る
        </Link>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'positive' | 'info' | 'negative' | 'muted'
}) {
  const toneClasses = {
    positive: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    info: 'bg-accent-soft border-accent/20 text-accent',
    negative: 'bg-red-50 border-red-200 text-red-700',
    muted: 'bg-surface-muted border-border text-muted',
  }[tone]
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses}`}>
      <p className="text-[10px] font-mono uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-bold font-mono tabular-nums text-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  )
}
