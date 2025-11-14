"use client";

import { useEffect, useState } from "react";
import { checkMonitor, type CustomMonitorConfig, type MonitorCheckResult } from "@/lib/custom-monitor";

interface UseCustomMonitorOptions {
  enabled?: boolean;
  interval?: number; // 检测间隔（毫秒）
}

export function useCustomMonitor(
  config: CustomMonitorConfig,
  options: UseCustomMonitorOptions = {}
) {
  const { enabled = true, interval = 60000 } = options;
  const [result, setResult] = useState<MonitorCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !config.url) {
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 使用客户端检测（通过代理 API）
        const response = await fetch("/api/custom-monitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monitors: [config],
          }),
        });

        if (!response.ok) {
          throw new Error(`API 错误: ${response.status}`);
        }

        const data = await response.json();
        const monitorResult = data.results?.[config.id];

        if (isMounted && monitorResult) {
          setResult(monitorResult);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "检测失败");
          console.error("[Custom Monitor Hook] Error:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // 立即执行一次
    performCheck();

    // 如果设置了间隔，定期执行
    if (interval > 0) {
      const intervalId = setInterval(performCheck, interval);
      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [config.id, config.url, enabled, interval]);

  return { result, isLoading, error };
}
