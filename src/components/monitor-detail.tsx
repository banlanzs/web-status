"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import Link from "next/link";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

import { ResponseTimeChart } from "@/components/response-time-chart";
import { StatusBadge } from "@/components/status-badge";
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
  const statusLabel = t(`monitor.status.${monitor.status}` as const);
  const hasResponseData = monitor.responseTimes.length > 0;

  return (
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

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-100">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{t("monitor.latestResponse")}</span>
              <strong className="text-emerald-600">
                {monitor.lastResponseTime ? `${monitor.lastResponseTime} ms` : "—"}
              </strong>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{t("monitor.avgResponse")}</span>
              <strong className="text-emerald-600">
                {monitor.averageResponseTime
                  ? `${formatNumber(monitor.averageResponseTime)} ms`
                  : "—"}
              </strong>
            </div>

            <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
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
                        monitor.incidents.totalDowntimeSeconds,
                      ),
                    })
                  : t("monitor.incidents", {
                      count: monitor.incidents.total,
                      duration: formatDuration(
                        monitor.incidents.totalDowntimeSeconds,
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
                <Link
                  href={
                    monitor.url.startsWith("http")
                      ? monitor.url
                      : `https://${monitor.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1 font-medium text-emerald-600 transition hover:text-emerald-500",
                  )}
                >
                  {t("monitor.viewSite")}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 4a1 1 0 011-1h9a1 1 0 011 1v9a1 1 0 11-2 0V6.414l-8.293 8.293a1 1 0 01-1.414-1.414L12.586 5H6a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              ) : (
                <span className="text-slate-400">
                  {t("monitor.linkDisabled")}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-100">
            {hasResponseData ? (
              <ResponseTimeChart
                data={(() => {
                  const now = dayjs();
                  const threeHoursAgo = now.subtract(3, "hour");
                  const recentData = monitor.responseTimes.filter((item) =>
                    dayjs(item.at).isAfter(threeHoursAgo),
                  );
                  return recentData.length > 0
                    ? recentData
                    : [...monitor.responseTimes].slice(-40);
                })()}
                label={t("monitor.responseChartTitle")}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 text-sm text-emerald-600">
                {t("monitor.responseChartTitle")}
              </div>
            )}
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
              {monitor.logs
                .sort((a, b) => {
                  return dayjs(b.datetime).valueOf() - dayjs(a.datetime).valueOf();
                })
                .map((log, index) => {
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
  );
}
