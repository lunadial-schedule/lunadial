/**
 * 루트 레이아웃
 *
 * 전체 앱에 적용되는 레이아웃. 폰트, 헤더, 토스터, Google AdSense 스크립트를 포함한다.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUNA DIAL - 스트리머 일정",
  description: "Streamer Calendar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-1MEXXLESCG" />
        <Script
          id="google-analytics"
          dangerouslySetInnerHTML={{
            __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-1MEXXLESCG');
`,
          }}
        />
        {process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID && (
          <>
            <meta
              name="google-adsense-account"
              content={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID}
            />
            <Script
              id="google-adsense"
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID}`}
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <AuthProvider>
          <AppHeader />
          <main className="flex-1 w-full mx-auto pb-10">
            {children}
          </main>
          <SiteFooter />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
