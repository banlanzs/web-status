"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export function ForceRefreshDetector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // 检查是否从详情页返回到首页
    const handlePopState = () => {
      // 如果是从监控详情页返回到首页，强制刷新数据
      if (pathname === "/" && document.referrer.includes("/monitor/")) {
        // 添加查询参数来标记强制刷新
        const url = new URL(window.location.href);
        url.searchParams.set('force', Date.now().toString());
        router.push(url.toString());
        router.refresh();
      }
    };

    // 添加浏览器历史记录变化的监听器
    window.addEventListener("popstate", handlePopState);

    // 检查当前页面是否是从详情页导航过来的
    if (pathname === "/" && document.referrer.includes("/monitor/")) {
      // 添加查询参数来标记强制刷新
      const url = new URL(window.location.href);
      url.searchParams.set('force', Date.now().toString());
      router.push(url.toString());
      router.refresh();
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, searchParams, router]);

  return null;
}