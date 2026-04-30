import type { Metadata, Viewport } from "next";
import { Inter, Zen_Kaku_Gothic_New, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import TrialBanner from "@/components/TrialBanner";
import Providers from "@/components/Providers";
import PwaRegister from "@/components/PwaRegister";
import { defaultAppConfig } from "@/lib/tenant/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: defaultAppConfig.appTitle,
  description: "建設業向けunion資材発注アプリケーション",
  applicationName: defaultAppConfig.appTitle,
  appleWebApp: {
    capable: true,
    title: defaultAppConfig.title,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#06b6d4" },
    { media: "(prefers-color-scheme: dark)", color: "#06b6d4" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${zenKaku.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <Header />
          <TrialBanner />
          {children}
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
