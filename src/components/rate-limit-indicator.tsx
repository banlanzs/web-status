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
    // 监听服务器端的速率限制错误
    const checkRateLimit = () => {
      // 从 localStorage 读取速率限制信息（如果服务器设置了）
      try {
        const stored = localStorage.getItem("rate_limit_info");
        if (stored) {
          const info = JSON.parse(stored) as RateLimitInfo;
          const age = Date.now() - (info.timestamp || 0);
          
          // 如果信息超过 60 秒，清除
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
    const interval = setInterval(checkRateLimit, 5000); // 每 5 秒检查一次

    return () => clearInterval(interval);
  }, []);

  if (!rateLimitInfo?.isLimited) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-lg dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-600 text-white dark:bg-yellow-400">
            <span className="text-xs font-bold">!</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
              API 速率限制
            </h3>
            <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
              {rateLimitInfo.message ||
                "已达到 API 请求上限 (10 req/min)，正在使用缓存数据。"}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300">
              <span>⏱️</span>
              <span>页面将自动刷新...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
