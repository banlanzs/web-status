"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { type NormalizedMonitor } from "@/types/uptimerobot";
import {
  getCachedMonitors,
  setCachedMonitors,
  clearMonitorsCache,
} from "@/lib/cache";

interface MonitorsContextValue {
  monitors: NormalizedMonitor[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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
  initialMonitors: NormalizedMonitor[];
}

export function MonitorsProvider({ children, initialMonitors }: MonitorsProviderProps) {
  // 先检查缓存，如果有缓存就用缓存，否则用初始数据
  const [monitors, setMonitors] = useState<NormalizedMonitor[]>(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedMonitors();
      if (cached && cached.length > 0) {
        console.log("[Monitors Provider] 初始化: 使用缓存数据");
        return cached;
      }
    }
    console.log("[Monitors Provider] 初始化: 使用服务器端数据");
    return initialMonitors;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  // 首次挂载时保存初始数据到缓存（仅当缓存不存在时）
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedMonitors();
      if (!cached || cached.length === 0) {
        setCachedMonitors(initialMonitors);
        console.log("[Monitors Provider] 保存初始数据到缓存");
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/monitors", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`API 错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.monitors && Array.isArray(data.monitors)) {
        setMonitors(data.monitors);
        setCachedMonitors(data.monitors);
        setLastUpdated(new Date());
        console.log("[Monitors Provider] 数据已刷新");
      }
    } catch (err: any) {
      console.error("[Monitors Provider] 刷新失败:", err);
      setError(err.message || "数据加载失败");
      
      // 失败时尝试使用缓存
      const cached = getCachedMonitors();
      if (cached) {
        setMonitors(cached);
        console.log("[Monitors Provider] 使用缓存数据");
      }
    } finally {
      setIsLoading(false);
    }
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
