'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { defaultAppConfig } from '@/lib/tenant/config'

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const dest =
        session.user.role === 'SUPER_ADMIN'
          ? '/super-admin'
          : `/${session.user.tenantCode}/dashboard`
      router.replace(dest)
    }
  }, [status, session, router])

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
          <div className="space-y-3 text-center">
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              URL をご確認ください
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              ログインには、ご利用の会社専用 URL が必要です。
              <br />
              管理者から共有された URL からアクセスしてください。
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">
          UNION
        </p>
      </div>
    </div>
  )
}
