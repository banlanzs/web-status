"use client";

import { useEffect, useState } from "react";

interface ApiQuotaInfo {
  remaining: number;
  total: number;
  cacheAge?: number;
  isFromCache?: boolean;
  isLimited?: boolean;
  resetIn?: number;
}

export function ApiQuotaDisplay() {
  const [quotaInfo, setQuotaInfo] = useState<ApiQuotaInfo | null>(null);

  useEffect(() => {
    // 获取实时配额信息
    const fetchQuotaInfo = async () => {
      try {
        // 首先检查是否有速率限制信息
        const rateLimitStored = localStorage.getItem("rate_limit_info");
        if (rateLimitStored) {
          const rateLimitInfo = JSON.parse(rateLimitStored);
          const age = Date.now() - (rateLimitInfo.timestamp || 0);
          
          // 如果速率限制信息有效（60秒内）
          if (age <= 60000 && rateLimitInfo.isLimited) {
            // 设置配额信息为0，表示已达到限制
            setQuotaInfo({
              remaining: 0,
              total: 10,
              isFromCache: true,
              cacheAge: age,
              isLimited: true,
              resetIn: rateLimitInfo.resetIn
            });
            return;
          }
        }
        
        // 获取实时配额信息
        const response = await fetch("/api/quota");
        if (response.ok) {
          const data = await response.json();
          setQuotaInfo({
            remaining: data.remaining,
            total: data.total,
            isLimited: data.isLimited,
            resetIn: data.resetIn
          });
        }
      } catch (e) {
        console.error("Failed to fetch quota info", e);
        // 如果获取实时信息失败，尝试从localStorage获取
        try {
          const stored = localStorage.getItem("api_quota_info");
          if (stored) {
            const info = JSON.parse(stored) as ApiQuotaInfo;
            setQuotaInfo(info);
          }
        } catch (e2) {
          console.error("Failed to parse quota info", e2);
        }
      }
    };

    fetchQuotaInfo();
    const interval = setInterval(fetchQuotaInfo, 10000); // 每 10 秒更新一次

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
      
      {quotaInfo.isLimited && quotaInfo.resetIn && (
        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ 已达到速率限制，将在 {Math.ceil(quotaInfo.resetIn / 1000)} 秒后重置
        </div>
      )}
    </div>
  );
}