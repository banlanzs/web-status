import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/providers/language-provider";
import { MonitorsProvider } from "@/components/providers/monitors-provider";
import { RateLimitIndicator } from "@/components/rate-limit-indicator";
import ErrorBoundary from "@/components/error-boundary";
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
  title: "✅ BANLAN站点监测",
  description: "基于 UptimeRobot API 的自定义网站监控展示页",
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <LanguageProvider>
            <MonitorsProvider>
              {children}
              <RateLimitIndicator />
            </MonitorsProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}