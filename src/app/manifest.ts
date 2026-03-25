import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'スマート資材発注 - 株式会社櫻建',
    short_name: 'スマート資材発注',
    description: '建設業向けスマート資材発注アプリケーション',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#475569',
    icons: [
      {
        src: '/icons/icon.jpeg',
        sizes: '166x166',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/icons/icon.jpeg',
        sizes: '166x166',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  }
}
