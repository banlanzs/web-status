"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 页面加载进度条
 */
export function LoadingBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;

    if (loading) {
      setProgress(10);
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 10;
        });
      }, 300);
    } else {
      setProgress(100);
      setTimeout(() => { setProgress(0); }, 500);
    }

    return () => { if (progressTimer) clearInterval(progressTimer); };
  }, [loading]);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);
    window.addEventListener("beforeunload", handleStart);
    return () => { window.removeEventListener("beforeunload", handleStart); };
  }, [router]);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        background: "linear-gradient(90deg, var(--accent), var(--warn))",
      }}
    />
  );
}

/**
 * 骨架屏加载组件
 */
export function SkeletonCard() {
  return (
    <div style={{
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      padding: "var(--space-5)",
      boxShadow: "var(--elev-ring)",
      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    }}>
      <div style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ height: "24px", width: "192px", background: "var(--border-soft)", borderRadius: "var(--radius-sm)" }}></div>
        <div style={{ height: "32px", width: "80px", background: "var(--border-soft)", borderRadius: "var(--radius-pill)" }}></div>
      </div>
      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        <div style={{ height: "16px", width: "100%", background: "var(--border-soft)", borderRadius: "var(--radius-sm)" }}></div>
        <div style={{ height: "16px", width: "75%", background: "var(--border-soft)", borderRadius: "var(--radius-sm)" }}></div>
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
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 40,
      background: "color-mix(in oklab, var(--bg), transparent 20%)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          height: "48px",
          width: "48px",
          animation: "spin 1s linear infinite",
          borderRadius: "9999px",
          borderWidth: "4px",
          borderStyle: "solid",
          borderColor: "var(--accent)",
          borderRightColor: "transparent",
        }}></div>
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
          加载中...
        </p>
      </div>
    </div>
  );
}

/**
 * 内联加载指示器
 */
export function InlineLoader() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
      <div style={{
        height: "16px",
        width: "16px",
        animation: "spin 1s linear infinite",
        borderRadius: "9999px",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "var(--accent)",
        borderRightColor: "transparent",
      }}></div>
      <span>加载中...</span>
    </div>
  );
}
