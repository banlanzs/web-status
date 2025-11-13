"use client";

import dayjs from "dayjs";
import Link from "next/link";

import { ResponseTimeChart } from "@/components/response-time-chart";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { cn, formatNumber, formatDuration } from "@/lib/utils";
import type { NormalizedMonitor } from "@/types/uptimerobot";

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

interface MonitorCardProps {
  monitor: NormalizedMonitor;
}

export function MonitorCard({ monitor }: MonitorCardProps) {
  const { t } = useLanguage();

  const statusLabel = t(`monitor.status.${monitor.status}` as const);

  const hasResponseData = monitor.responseTimes.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-100 backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-800">
            {monitor.name}
          </h2>
          <span className="text-sm text-slate-500">
            {t("monitor.typeInterval", {
              type: monitor.type,
              interval: monitor.interval / 60, // 转换为分钟
            })}
          </span>
        </div>
        <StatusBadge status={monitor.status} label={statusLabel} />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{t("monitor.latestResponse")}</span>
            <strong className="text-emerald-600">
              {monitor.lastResponseTime
                ? `${monitor.lastResponseTime} ms`
                : "—"}
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
                  ? `${formatNumber(monitor.downDuration.last90Days)}s`
                  : "—"}
              </strong>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            {monitor.incidents.total > 0 || (monitor.downDuration.last90Days && monitor.downDuration.last90Days > 0)
              ? (monitor.incidents.downCount > 0 || monitor.incidents.pauseCount > 0
                  ? t("monitor.incidentsDetail", {
                      downCount: monitor.incidents.downCount,
                      pauseCount: monitor.incidents.pauseCount,
                      duration: formatDuration(monitor.incidents.totalDowntimeSeconds),
                    })
                  : t("monitor.incidents", {
                      count: monitor.incidents.total,
                      duration: formatDuration(monitor.incidents.totalDowntimeSeconds),
                    }))
              : t("monitor.incidentsNone")}
          </p>
        </div>

        <div className="flex flex-col justify-between">
          {hasResponseData ? (
            <ResponseTimeChart
              data={(() => {
                // 获取最近3小时的数据
                const now = dayjs();
                const threeHoursAgo = now.subtract(3, 'hour');
                const recentData = monitor.responseTimes.filter(item => 
                  dayjs(item.at).isAfter(threeHoursAgo)
                );
                // 如果最近3小时没有数据，则显示最近的40条数据
                // 这样可以确保图表始终有数据显示
                return recentData.length > 0 ? recentData : [...monitor.responseTimes].slice(-40);
              })()}
              label={t("monitor.responseChartTitle")}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 text-sm text-emerald-600">
              {t("monitor.responseChartTitle")}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              {monitor.lastCheckedAt
                ? dayjs(monitor.lastCheckedAt).format("YYYY-MM-DD HH:mm:ss")
                : ""}
            </span>
            {SHOW_LINKS ? (
              <Link
                href={monitor.url.startsWith("http") ? monitor.url : `https://${monitor.url}`}
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
      </div>
    </section>
  );
}

