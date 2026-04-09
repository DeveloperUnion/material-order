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
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-6">
          <div
            className={`flex items-center ${pathname !== '/' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={handleLogoClick}
          >
            <Image src={config.icon} alt={config.title} width={80} height={80} className="mix-blend-multiply w-14 h-14 sm:w-20 sm:h-20" />
            <h1 className='text-black text-xl sm:text-2xl ml-1 sm:ml-4 font-bold'>union資材発注</h1>
          </div>
          {pathname !== '/' && (
            <div className="flex items-center gap-1 sm:gap-4">
              {session?.user && (
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
                >
                  <div className="w-9 h-9 bg-[#ecfeff] rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-[#0891b2]" />
                  </div>
                  <span className="font-medium hidden sm:inline">{session.user.name}</span>
                </button>
              )}
              <Button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-base border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5] shadow-none px-2 sm:px-4"
              >
                <LogOut className="h-5 w-5" />
                ログアウト
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}