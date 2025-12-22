'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UserInfo {
  username: string
  companyName: string
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    if (pathname !== '/') {
      fetchUserInfo()
    }
  }, [pathname])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data.user)
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
    }
  }

  const handleLogout = async () => {
    // localStorageも併せてクリア
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userName')

    const response = await fetch('/api/auth/logout', { method: 'POST' })

    if (response.ok) {
      router.push('/')
      router.refresh()
    } else {
      // APIが失敗してもログアウト処理を実行
      router.push('/')
      router.refresh()
    }
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
            <Image src="/oken.png" alt="櫻建資材発注" width={40} height={40} />
            <h1 className='text-black text-2xl ml-4 font-bold'>櫻建資材発注</h1>
          </div>
          {pathname !== '/' && (
            <div className="flex items-center gap-2 md:gap-4">
              {userInfo && (
                <div className="hidden sm:flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-1" />
                  <span>{userInfo.companyName}</span>
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
