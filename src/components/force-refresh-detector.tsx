"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export function ForceRefreshDetector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // 只处理 force 参数的清理，避免其他操作
    if (pathname === "/" && searchParams.get('force')) {
      // 创建不带 force 参数的新 URL
      const url = new URL(window.location.href);
      url.searchParams.delete('force');
      
      // 使用 replace 而不是 push 来避免添加到浏览器历史
      router.replace(url.pathname + url.search);
    }
  }, [pathname, searchParams, router]);

  return null;
}