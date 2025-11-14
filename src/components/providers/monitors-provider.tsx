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
}

export function MonitorsProvider({ children }: MonitorsProviderProps) {
  // 先检查缓存，如果有缓存就用缓存
  const [monitors, setMonitors] = useState<NormalizedMonitor[]>(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedMonitors();
      if (cached && cached.length > 0) {
        console.log("[Monitors Provider] 初始化: 使用缓存数据");
        return cached;
      }
    }
    return [];
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 首次挂载时自动加载数据
  useEffect(() => {
    const loadInitialData = async () => {
      // 如果已经有缓存数据，先显示缓存，然后在后台刷新
      const cached = getCachedMonitors();
      if (cached && cached.length > 0) {
        setMonitors(cached);
        setIsLoading(false);
        console.log("[Monitors Provider] 使用缓存数据，后台刷新中...");
      }

      // 加载最新数据
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
          console.log("[Monitors Provider] 数据加载完成");
        }
      } catch (err: any) {
        console.error("[Monitors Provider] 加载失败:", err);
        setError(err.message || "数据加载失败");
        
        // 如果没有缓存且加载失败，保持 loading 状态但显示错误
        if (!cached || cached.length === 0) {
          setMonitors([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
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
