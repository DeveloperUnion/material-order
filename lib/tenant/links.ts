'use client'

import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'

// 認証済みのテナントパス前置ヘルパー。
// session の tenantCode を優先し、未確定なら URL の [tenantCode] params を使う。
// どちらも取れない時 (未認証) は path をそのまま返す (root に飛ぶ想定)。
export function useTenantPath(): (path: string) => string {
  const { data: session } = useSession()
  const params = useParams<{ tenantCode?: string }>()
  const code = session?.user?.tenantCode || params?.tenantCode || ''

  return useCallback(
    (path: string) => {
      if (!code) return path
      if (!path.startsWith('/')) return `/${code}/${path}`
      return `/${code}${path}`
    },
    [code]
  )
}

// session 不要の純粋ヘルパー (server component でも使える)
export function tenantPath(tenantCode: string, path: string): string {
  if (!path.startsWith('/')) return `/${tenantCode}/${path}`
  return `/${tenantCode}${path}`
}
