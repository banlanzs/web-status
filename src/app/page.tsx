"use client";

import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { ForceRefreshDetector } from "@/components/force-refresh-detector";
import { useMonitors } from "@/components/providers/monitors-provider";
import { LoadingOverlay } from "@/components/loading";

export default function Home() {
  const { monitors, error, isLoading } = useMonitors();
  const fetchedAt = new Date().toISOString();

  // 首次加载且无数据时显示全屏加载
  if (isLoading && monitors.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">加载监控数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <ForceRefreshDetector />
      </Suspense>
      <Dashboard
        monitors={monitors}
        fetchedAt={fetchedAt}
        errorMessage={error}
      />
    </>
  );
}