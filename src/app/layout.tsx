import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/providers/language-provider";
import { MonitorsProvider } from "@/components/providers/monitors-provider";
import { RateLimitIndicator } from "@/components/rate-limit-indicator";
import { fetchMonitors } from "@/lib/uptimerobot";
import type { NormalizedMonitor } from "@/types/uptimerobot";
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
  title: "BANLAN站点监测",
  description: "基于 UptimeRobot API 的自定义网站监控展示页",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 在根 layout 获取初始数据
  let initialMonitors: NormalizedMonitor[] = [];
  try {
    initialMonitors = await fetchMonitors(false);
  } catch (error) {
    console.error("[Layout] 加载初始数据失败:", error);
  }

  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <MonitorsProvider initialMonitors={initialMonitors}>
            {children}
            <RateLimitIndicator />
          </MonitorsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
