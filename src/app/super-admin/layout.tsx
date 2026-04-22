import { notFound } from 'next/navigation'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import SuperAdminNav from '@/components/super-admin/SuperAdminNav'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSuperAdminSession()
  if (!session) notFound()

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminNav userName={session.user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
