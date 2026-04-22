import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NewTenantForm from '@/components/super-admin/NewTenantForm'

export default function NewTenantPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">新規テナント作成</h1>
        <p className="text-sm text-muted mt-1">
          テナントと管理者ユーザーを作成し、管理者宛に招待リンクを送信します。
        </p>
      </div>

      <NewTenantForm />
    </div>
  )
}
