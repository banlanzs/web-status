"use client";

import { useEffect, useState } from "react";

interface RateLimitInfo {
  isLimited: boolean;
  message?: string;
  timestamp?: number;
}

export function RateLimitIndicator() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(
    null
  );

  useEffect(() => {
    const checkRateLimit = () => {
      try {
        const stored = localStorage.getItem("rate_limit_info");
        if (stored) {
          const info = JSON.parse(stored) as RateLimitInfo;
          const age = Date.now() - (info.timestamp || 0);

          if (age > 60000) {
            localStorage.removeItem("rate_limit_info");
            setRateLimitInfo(null);
          } else {
            setRateLimitInfo(info);
          }
        }
      } catch (e) {
        console.error("Failed to parse rate limit info", e);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!rateLimitInfo?.isLimited) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "var(--space-4)",
      right: "var(--space-4)",
      zIndex: 50,
      maxWidth: "448px",
    }}>
      <div style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid color-mix(in oklab, var(--warn), var(--border) 68%)",
        background: "color-mix(in oklab, var(--warn), var(--surface) 88%)",
        padding: "var(--space-4)",
        boxShadow: "var(--elev-raised)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
          <div style={{
            display: "flex",
            height: "20px",
            width: "20px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            background: "var(--warn)",
            color: "var(--fg)",
          }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>!</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 600, color: "var(--fg)" }}>
              API 速率限制
            </h3>
            <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
              {rateLimitInfo.message ||
                "已达到 API 请求上限 (10 req/min)，正在使用缓存数据。"}
            </p>
            <div style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--meta)" }}>
              <span>⏱️</span>
              <span>页面将自动刷新...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
