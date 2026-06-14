"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MonitorDetail } from "@/components/monitor-detail";
import { useMonitors } from "@/components/providers/monitors-provider";
import { SkeletonCard } from "@/components/loading";
import type { NormalizedMonitor } from "@/types/uptimerobot";

export default function MonitorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { monitors, isLoading } = useMonitors();
  const [monitor, setMonitor] = useState<NormalizedMonitor | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (id && monitors.length > 0) {
      const found = monitors.find((m) => String(m.id) === id);
      if (found && mountedRef.current) {
        setMonitor(found);
        setIsInitializing(false);
      } else if (!found && mountedRef.current) {
        // 监控不存在时重定向到首页
        router.push('/');
      }
    } else if (!isLoading && monitors.length > 0 && mountedRef.current) {
      // 数据已加载但找不到监控
      setIsInitializing(false);
    }
  }, [id, monitors, router, isLoading]);

  // 如果URL中的ID无效，也重定向
  if (!id) {
    router.push('/');
    return null;
  }

  // 显示加载状态，直到找到监控或确认不存在
  if (isInitializing || !monitor || (isLoading && monitors.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!monitor && monitors.length > 0) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">监控器未找到</h1>
          <p className="mt-2 text-slate-600">ID: {id}</p>
        </div>
      </div>
    );
  }

  // 添加错误边界和额外的检查
  if (monitor) {
    try {
      return (
        <div key={`monitor-${monitor.id}`} className="page-container">
          <MonitorDetail monitor={monitor} />
        </div>
      );
    } catch (error) {
      console.error("Error rendering monitor detail:", error);
      // 如果渲染出错，刷新页面
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return null;
    }
  }

  return null;
}