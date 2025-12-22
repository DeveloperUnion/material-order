import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import { getCurrentTenantId, getCurrentTenantConfig } from "@/lib/tenant/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCurrentTenantConfig();
  return {
    title: config.appConfig.appTitle,
    description: "建設業向け資材発注管理アプリケーション",
    icons: {
      apple: config.appConfig.icon,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenantId = await getCurrentTenantId();

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers tenantId={tenantId}>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
