import { MetadataRoute } from 'next'
import { defaultAppConfig } from '@/lib/tenant/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: defaultAppConfig.appTitle,
    short_name: defaultAppConfig.title,
    description: '建設業向けunion資材発注アプリケーション',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafaf9',
    theme_color: '#06b6d4',
    lang: 'ja',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: '新規発注',
        short_name: '発注',
        description: '資材を新規発注する',
        url: '/material-order',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: '発注履歴',
        short_name: '履歴',
        description: '過去の発注履歴を確認する',
        url: '/order-history',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
