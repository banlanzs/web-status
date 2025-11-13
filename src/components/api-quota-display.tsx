"use client";

import { useEffect, useState } from "react";

interface ApiQuotaInfo {
  remaining: number;
  total: number;
  cacheAge?: number;
  isFromCache?: boolean;
}

export function ApiQuotaDisplay() {
  const [quotaInfo, setQuotaInfo] = useState<ApiQuotaInfo | null>(null);

  useEffect(() => {
    // 从页面加载时的服务器响应中提取配额信息
    // 这是一个简单的演示实现，实际可以通过 API route 获取实时数据
    
    // 模拟：从 localStorage 读取上次的配额信息
    const checkQuota = () => {
      try {
        const stored = localStorage.getItem("api_quota_info");
        if (stored) {
          const info = JSON.parse(stored) as ApiQuotaInfo;
          setQuotaInfo(info);
        }
      } catch (e) {
        console.error("Failed to parse quota info", e);
      }
    };

    checkQuota();
    const interval = setInterval(checkQuota, 10000); // 每 10 秒更新一次

    return () => clearInterval(interval);
  }, []);

  if (!quotaInfo) return null;

  const usedPercentage = ((quotaInfo.total - quotaInfo.remaining) / quotaInfo.total) * 100;
  const isWarning = quotaInfo.remaining <= 3;
  const isLowQuota = quotaInfo.remaining <= 5;

  return (
    <div className="mb-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${
            isWarning ? "bg-red-500 animate-pulse" : 
            isLowQuota ? "bg-yellow-500" : 
            "bg-green-500"
          }`} />
          <span className="text-sm font-medium">
            API 配额
          </span>
        </div>
        <div className="text-sm">
          <span className={`font-bold ${
            isWarning ? "text-red-600 dark:text-red-400" : 
            isLowQuota ? "text-yellow-600 dark:text-yellow-400" : 
            "text-green-600 dark:text-green-400"
          }`}>
            {quotaInfo.remaining}
          </span>
          <span className="text-muted-foreground"> / {quotaInfo.total} 请求/分钟</span>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={`h-full transition-all duration-500 ${
            isWarning ? "bg-red-500" : 
            isLowQuota ? "bg-yellow-500" : 
            "bg-green-500"
          }`}
          style={{ width: `${usedPercentage}%` }}
        />
      </div>

      {quotaInfo.isFromCache && quotaInfo.cacheAge !== undefined && (
        <div className="mt-2 text-xs text-muted-foreground">
          📦 使用缓存数据 (已缓存 {Math.round(quotaInfo.cacheAge / 1000)} 秒)
        </div>
      )}
      
      {isWarning && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          ⚠️ 配额即将用尽，请稍后再刷新
        </div>
      )}
    </div>
  );
}
