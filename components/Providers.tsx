'use client'

import { SessionProvider } from 'next-auth/react'
import { TenantProvider } from '@/lib/tenant/context'
import { TenantId } from '@/lib/tenant/config'

interface ProvidersProps {
  children: React.ReactNode
  tenantId: TenantId
}

export default function Providers({ children, tenantId }: ProvidersProps) {
  return (
    <SessionProvider>
      <TenantProvider initialTenantId={tenantId}>
        {children}
      </TenantProvider>
    </SessionProvider>
  )
}
