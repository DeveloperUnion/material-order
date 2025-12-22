'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { LogOut, User } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useTenant } from '@/lib/tenant/context'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { config } = useTenant()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const handleLogoClick = () => {
    if (pathname !== '/') {
      router.push('/dashboard')
    }
  }

  return (
    <header className="print:hidden bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div
            className={`flex items-center ${pathname !== '/' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={handleLogoClick}
          >
            <Image src={config.appConfig.icon} alt={config.appConfig.title} width={40} height={40} />
            <h1 className='text-black text-2xl ml-4 font-bold'>{config.appConfig.title}</h1>
          </div>
          {pathname !== '/' && (
            <div className="flex items-center gap-2 md:gap-4">
              {session?.user && (
                <div className="hidden sm:flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-1" />
                  <span>{session.user.name}</span>
                </div>
              )}
              <Button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}