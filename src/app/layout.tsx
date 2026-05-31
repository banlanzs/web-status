import type { Metadata } from "next";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MonitorsProvider } from "@/components/providers/monitors-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RateLimitIndicator } from "@/components/rate-limit-indicator";
import ErrorBoundary from "@/components/error-boundary";
import "./globals.css";

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
    <html lang="zh" data-theme="light">
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <MonitorsProvider>
                  {children}
                  <RateLimitIndicator />
                </MonitorsProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
