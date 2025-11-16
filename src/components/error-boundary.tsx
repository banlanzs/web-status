"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // 更新 state 使下一次渲染可以显示降级 UI
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // 如果是 React 19 的 removeChild 错误，刷新页面
    if (error.message.includes("removeChild") || error.message.includes("null")) {
      // 延迟刷新以避免无限循环
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 100);
    }
  }

  public render() {
    if (this.state.hasError) {
      // 你可以渲染任何自定义的降级 UI
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
            <h2 className="text-xl font-bold text-slate-800 mb-2">页面出现错误</h2>
            <p className="text-slate-600 mb-4">正在尝试自动恢复...</p>
            <button 
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            >
              点击刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;