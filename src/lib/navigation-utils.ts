/**
 * 导航工具函数，用于处理 Next.js 15 + React 19 中的页面转换问题
 */

// 防抖函数，用于延迟执行函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// 检查是否需要强制刷新页面
export function shouldForceRefresh(fromPath: string, toPath: string): boolean {
  // 从首页到监控详情页的导航需要特殊处理
  if (fromPath === '/' && toPath.startsWith('/monitor/')) {
    return true;
  }
  
  // 其他情况不需要强制刷新
  return false;
}

// 安全地执行页面刷新
export function safeRefresh(): void {
  try {
    // 使用 queueMicrotask 确保在组件完全卸载后执行
    queueMicrotask(() => {
      // 检查页面是否仍在正确的路径上
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    });
  } catch (error) {
    console.warn('Failed to refresh page:', error);
    // 作为后备方案，直接刷新
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  }
}

// 检查 React 容器状态
export function checkReactContainer(): boolean {
  if (typeof document === 'undefined') return true;
  
  // 检查是否存在多个 React 容器
  const containers = document.querySelectorAll('[data-react-container]');
  return containers.length <= 1;
}