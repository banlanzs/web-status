"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

import { LoginModal } from "@/components/login-modal";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { cn, formatDuration, formatNumber } from "@/lib/utils";
import type { NormalizedMonitor } from "@/types/uptimerobot";

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

interface MonitorDetailProps {
  monitor: NormalizedMonitor;
}

export function MonitorDetail({ monitor }: MonitorDetailProps) {
  const { t } = useLanguage();
  const { isLoggedIn, isProtectionEnabled } = useAuth();
  const statusLabel = t(`monitor.status.${monitor.status}` as const);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 添加 ref 来跟踪组件是否已卸载
  const isMountedRef = useRef(true);

  // 日志分页状态
  const [visibleLogsCount, setVisibleLogsCount] = useState(5);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // 每次加载更多日志的数量
  const LOGS_PER_PAGE = 10;

  // 组件卸载时设置 isMountedRef 为 false
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 获取排序后的日志
  const sortedLogs = [...monitor.logs].sort((a, b) => {
    const timeDiff = dayjs(b.datetime).valueOf() - dayjs(a.datetime).valueOf();
    if (timeDiff !== 0) return timeDiff;

    // 时间相同时的排序规则 (降序/显示顺序)
    // Paused (99) 应该在 Up (2) 之前顯示 (作为最新状态)
    if (a.type === 99 && b.type === 2) return -1;
    if (a.type === 2 && b.type === 99) return 1;

    // Started (98) 应该在 Paused (99) 之前顯示 (作为最新状态)
    if (a.type === 98 && b.type === 99) return -1;
    if (a.type === 99 && b.type === 98) return 1;

    return 0;
  });

  // 当前显示的日志
  const visibleLogs = sortedLogs.slice(0, visibleLogsCount);

  // 是否还有更多日志可以加载
  const hasMoreLogs = visibleLogsCount < sortedLogs.length;

  // 加载更多日志的函数
  const loadMoreLogs = () => {
    if (!isMountedRef.current) return;

    setIsLoadingLogs(true);
    // 模拟加载延迟，让用户看到加载效果
    setTimeout(() => {
      if (isMountedRef.current) {
        setVisibleLogsCount(prev => prev + LOGS_PER_PAGE);
        setIsLoadingLogs(false);
      }
    }, 300);
  };

  // 计算监控创建日期（如果有）
  const createDate = monitor.createDatetime ? dayjs.unix(monitor.createDatetime) : null;
  const monitorLink = monitor.url.startsWith("http")
    ? monitor.url
    : `https://${monitor.url}`;

  const handleOpenMonitorLink = () => {
    if (isProtectionEnabled && !isLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }
    window.open(monitorLink, "_blank", "noopener,noreferrer");
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">加载监控详情中...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto w-full max-w-5xl px-6 py-10 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500"
              >
                <span>&larr;</span>
                <span>{t("app.name")}</span>
              </Link>
              <h1 className="text-2xl font-semibold text-slate-900">
                {monitor.name}
              </h1>
              <p className="text-sm text-slate-500">
                {t("monitor.typeInterval", {
                  type: monitor.type,
                  interval: monitor.interval / 60,
                })}
              </p>
            </div>
            <StatusBadge status={monitor.status} label={statusLabel} />
          </div>

          <section className="grid gap-6 md:grid-cols-1">
            <div className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-100">
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{t("monitor.uptimeLast90")}</span>
                  <strong>
                    {monitor.uptimeRatio.last90Days !== null
                      ? `${formatNumber(monitor.uptimeRatio.last90Days)}%`
                      : "—"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("monitor.downDurationLast90")}</span>
                  <strong>
                    {monitor.downDuration.last90Days !== null
                      ? formatDuration(monitor.downDuration.last90Days)
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm text-slate-600">
                {/* 显示监控创建日期 */}
                {createDate && (
                  <div className="flex items-center justify-between">
                    <span>创建日期</span>
                    <strong>{createDate.format("YYYY-MM-DD HH:mm:ss")}</strong>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500">
                {monitor.incidents.total > 0 ||
                  (monitor.downDuration.last90Days &&
                    monitor.downDuration.last90Days > 0)
                  ? monitor.incidents.downCount > 0 ||
                    monitor.incidents.pauseCount > 0
                    ? t("monitor.incidentsDetail", {
                      downCount: monitor.incidents.downCount,
                      pauseCount: monitor.incidents.pauseCount,
                      duration: formatDuration(
                        monitor.incidents.totalDowntimeSeconds + monitor.incidents.totalPausedSeconds,
                      ),
                    })
                    : t("monitor.incidents", {
                      count: monitor.incidents.total,
                      duration: formatDuration(
                        monitor.incidents.totalDowntimeSeconds + monitor.incidents.totalPausedSeconds,
                      ),
                    })
                  : t("monitor.incidentsNone")}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {monitor.lastCheckedAt
                    ? dayjs(monitor.lastCheckedAt).format(
                      "YYYY-MM-DD HH:mm:ss",
                    )
                    : ""}
                </span>
                {SHOW_LINKS ? (
                  <button
                    type="button"
                    onClick={handleOpenMonitorLink}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full p-1.5 transition",
                      isProtectionEnabled && !isLoggedIn
                        ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700",
                    )}
                    title={isProtectionEnabled && !isLoggedIn ? t("auth.loginPrompt") : t("monitor.viewSite")}
                    aria-label={isProtectionEnabled && !isLoggedIn ? t("auth.loginPrompt") : t("monitor.viewSite")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                ) : (
                  <span className="text-slate-400">
                    {t("monitor.linkDisabled")}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 最近事件日志 */}
          <section className="rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-100">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              事件日志
              {monitor.logs.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  （最近 {monitor.logs.length} 条）
                </span>
              )}
            </h2>
            {monitor.logs.length > 0 ? (
              <div className="space-y-3">
                {visibleLogs.map((log, index) => {
                  const logTime = dayjs(log.datetime);
                  const getLogTypeLabel = (type: number) => {
                    switch (type) {
                      case 1:
                        return { label: "宕机 (Down)", color: "text-rose-600 bg-rose-50 border-rose-200" };
                      case 2:
                        return { label: "恢复 (Up)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
                      case 99:
                        return { label: "暂停 (Paused)", color: "text-amber-600 bg-amber-50 border-amber-200" };
                      case 98:
                        return { label: "启动 (Started)", color: "text-blue-600 bg-blue-50 border-blue-200" };
                      default:
                        return { label: `类型 ${type}`, color: "text-slate-600 bg-slate-50 border-slate-200" };
                    }
                  };
                  const typeInfo = getLogTypeLabel(log.type);

                  return (
                    <div
                      key={index}
                      className="rounded-lg border bg-white p-4 text-sm shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-lg border px-3 py-1 text-xs font-medium ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                          <span className="font-mono text-slate-700">
                            {logTime.format("YYYY-MM-DD HH:mm:ss")}
                          </span>
                        </div>
                        {log.duration !== null && log.duration > 0 && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            持续: {formatDuration(log.duration)}
                          </span>
                        )}
                      </div>
                      {log.reason && (log.reason.code || log.reason.detail) && (
                        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">原因: </span>
                          {log.reason.detail || log.reason.code}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 加载更多按钮 */}
                {hasMoreLogs && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={loadMoreLogs}
                      disabled={isLoadingLogs || !isMountedRef.current}
                      className="flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-70"
                    >
                      {isLoadingLogs ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          加载中...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          加载更多日志
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center text-sm text-slate-500">
                <div className="mb-2">📋 暂无日志数据</div>
                <div className="text-xs">监控尚未产生任何事件记录</div>
              </div>
            )}
          </section>
        </div>
      </div>
      {isProtectionEnabled ? (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      ) : null}
    </Suspense>
  );
}
