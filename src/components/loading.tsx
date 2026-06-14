"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 页面加载进度条
 * 在页面切换时显示顶部加载条
 */
export function LoadingBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    
    if (loading) {
      setProgress(10);
      
      // 模拟进度增长
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 10;
        });
      }, 300);
    } else {
      setProgress(100);
      
      // 完成后重置
      setTimeout(() => {
        setProgress(0);
      }, 500);
    }

    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [loading]);

  // 监听路由变化
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    // Next.js 15+ 使用新的事件监听方式
    window.addEventListener("beforeunload", handleStart);
    
    return () => {
      window.removeEventListener("beforeunload", handleStart);
    };
  }, [router]);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
}

/**
 * 骨架屏加载组件
 */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 animate-pulse">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-6 w-48 bg-slate-200 rounded"></div>
        <div className="h-8 w-20 bg-slate-200 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-200 rounded"></div>
        <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

/**
 * 加载中遮罩层
 */
export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
        <p className="mt-4 text-sm text-slate-600">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 内联加载指示器
 */
export function InlineLoader() {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-emerald-500 border-r-transparent"></div>
      <span>加载中...</span>
    </div>
  );
}
