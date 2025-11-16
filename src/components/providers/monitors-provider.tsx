"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { type NormalizedMonitor } from "@/types/uptimerobot";

interface MonitorsContextValue {
  monitors: NormalizedMonitor[];
  isLoading: boolean;
  error: string | null;
  refresh: (forceRefresh?: boolean) => Promise<void>;
  lastUpdated: Date | null;
}

const MonitorsContext = createContext<MonitorsContextValue | null>(null);

export function useMonitors() {
  const context = useContext(MonitorsContext);
  if (!context) {
    throw new Error("useMonitors must be used within MonitorsProvider");
  }
  return context;
}

interface MonitorsProviderProps {
  children: ReactNode;
}

// 客户端缓存配置
const CLIENT_CACHE_TTL = 30 * 1000; // 30 秒客户端缓存
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 分钟自动刷新间隔
const CACHE_KEY = "monitors_cache";
const CACHE_TIME_KEY = "monitors_cache_time";

export function MonitorsProvider({ children }: MonitorsProviderProps) {
  const [monitors, setMonitors] = useState<NormalizedMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // 客户端挂载后立即从缓存读取数据，并检查是否需要刷新
  useEffect(() => {
    // 添加变量来跟踪组件是否已卸载
    let isMounted = true;
    
    if (typeof window !== "undefined") {
      const initializeData = async () => {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
          
          if (cached && cachedTime && isMounted) {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - parseInt(cachedTime, 10);
            
            console.log(`[Monitors Provider] 发现缓存数据 (缓存年龄: ${Math.round(cacheAge / 1000)} 秒)`);
            
            // 如果缓存超过5分钟，执行真刷新
            if (cacheAge > AUTO_REFRESH_INTERVAL) {
              console.log(`[Monitors Provider] 缓存已过期 (超过 ${AUTO_REFRESH_INTERVAL / 60000} 分钟)，执行真刷新...`);
              await loadData(isMounted);
            } else {
              // 缓存未过期，模拟加载然后显示缓存数据
              console.log(`[Monitors Provider] 缓存未过期，使用缓存数据`);
              // 模拟加载时间，让用户看到加载状态
              await new Promise(resolve => setTimeout(resolve, 800));
              if (isMounted) {
                setMonitors(cachedData);
                setLastUpdated(new Date(parseInt(cachedTime, 10)));
                setIsLoading(false);
              }
            }
          } else if (isMounted) {
            // 如果没有缓存，则首次加载数据
            console.log("[Monitors Provider] 无缓存，首次加载数据");
            await loadData(isMounted);
          }
        } catch (e) {
          console.error("[Monitors Provider] 初始化失败:", e);
          // 出错时尝试加载数据
          if (isMounted) {
            await loadData(isMounted);
          }
        }
      };
      
      initializeData();
    }
    
    // 清理函数
    return () => {
      isMounted = false;
    };
  }, []);

  // 真实加载数据的函数
  const loadData = async (isMounted: boolean) => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // 添加时间戳参数强制刷新服务端缓存
      const response = await fetch(`/api/monitors?force=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error('API error: ' + response.status);
      }

      const data = await response.json();
      
      if (data.monitors && Array.isArray(data.monitors) && isMounted) {
        setMonitors(data.monitors);
        const fetchTime = Date.now();
        setLastUpdated(new Date(fetchTime));
        
        // 保存到 localStorage
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.monitors));
            localStorage.setItem(CACHE_TIME_KEY, String(fetchTime));
          } catch (e) {
            console.error("[Monitors Provider] 保存缓存失败:", e);
          }
        }
        
        console.log("[Monitors Provider] 数据已刷新");
      }
    } catch (err: any) {
      console.error("[Monitors Provider] 刷新失败:", err);
      if (isMounted) {
        setError(err.message || "数据加载失败");
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  const refresh = useCallback(async (forceRefresh = false) => {
    // 检查组件是否已卸载
    if (!document.body) return;
    
    const now = Date.now();
    
    // 从 localStorage 读取上次刷新时间
    let lastFetchTime = 0;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_TIME_KEY);
        if (cached) {
          lastFetchTime = parseInt(cached, 10);
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    const timeSinceLastFetch = now - lastFetchTime;

    // 如果不是强制刷新且距离上次获取不到 30 秒，使用缓存数据（假刷新）
    if (!forceRefresh && timeSinceLastFetch < CLIENT_CACHE_TTL) {
      console.log(
        `[Monitors Provider] 假刷新 - 使用缓存数据 (距离上次刷新 ${Math.round(timeSinceLastFetch / 1000)} 秒，需等待 ${Math.round((CLIENT_CACHE_TTL - timeSinceLastFetch) / 1000)} 秒)`
      );
      // 假刷新：显示 loading 状态但使用缓存数据
      setIsLoading(true);
      // 使用 setTimeout 模拟加载效果
      setTimeout(() => {
        if (document.body) { // 再次检查组件是否仍然挂载
          setIsLoading(false);
        }
      }, 300); // 300ms 的假加载时间
      return;
    }

    // 超过 30 秒或强制刷新，执行真刷新
    console.log(`[Monitors Provider] 真刷新 - ${forceRefresh ? '强制刷新' : '距离上次刷新 ' + Math.round(timeSinceLastFetch / 1000) + ' 秒'}`);
    await loadData(true);
  }, []);

  return (
    <MonitorsContext.Provider
      value={{
        monitors,
        isLoading,
        error,
        refresh,
        lastUpdated,
      }}
    >
      {children}
    </MonitorsContext.Provider>
  );
}