"use client";

import { useState } from "react";
import { MonitorGroup } from "@/config/monitor-groups";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { useLanguage } from "@/components/providers/language-provider";
import { StatusBadge } from "@/components/status-badge";

interface MonitorGroupComponentProps {
  group: MonitorGroup;
  monitors: NormalizedMonitor[];
  onRequestLogin: () => void;
}

export function MonitorGroupComponent({ 
  group, 
  monitors, 
  onRequestLogin 
}: MonitorGroupComponentProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  // 计算分组状态统计
  const groupStats = {
    total: monitors.length,
    up: monitors.filter(m => m.status === "up").length,
    down: monitors.filter(m => m.status === "down").length,
    paused: monitors.filter(m => m.status === "paused").length,
  };

  // 确定分组整体状态
  const groupStatus = groupStats.down > 0 ? "down" : 
                    groupStats.paused === groupStats.total ? "paused" : "up";

  // 颜色映射
  const colorClasses = {
    emerald: "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60",
    blue: "border-blue-200 bg-blue-50/60 hover:bg-blue-100/60",
    purple: "border-purple-200 bg-purple-50/60 hover:bg-purple-100/60",
    orange: "border-orange-200 bg-orange-50/60 hover:bg-orange-100/60",
    slate: "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60",
  };

  const colorClass = colorClasses[group.color as keyof typeof colorClasses] || colorClasses.slate;

  return (
    <div className={`rounded-2xl border transition ${colorClass}`}>
      {/* 分组头部 */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{group.icon}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-slate-600">{group.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <StatusBadge 
            status={groupStatus} 
            label={`${groupStats.up}/${groupStats.total} 正常`}
          />
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label={isExpanded ? "收起" : "展开"}
          >
            <svg 
              className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 监控列表 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {monitors.map((monitor) => (
            <SimpleMonitorItem
              key={monitor.id}
              monitor={monitor}
              onRequestLogin={onRequestLogin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 简化版的监控项组件，用于分组内显示
import dayjs from "dayjs";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { formatNumber } from "@/lib/utils";

const SHOW_LINKS = process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" && 
                  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

interface SimpleMonitorItemProps {
  monitor: NormalizedMonitor;
  onRequestLogin: () => void;
}

function SimpleMonitorItem({ monitor, onRequestLogin }: SimpleMonitorItemProps) {
  const { t } = useLanguage();
  const { isLoggedIn, isProtectionEnabled } = useAuth();

  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/60">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/monitor/${monitor.id}`}
            prefetch={false}
            className="font-medium text-slate-900 hover:text-emerald-600 hover:underline"
          >
            {monitor.name}
          </Link>
          <span className="text-xs text-slate-500">
            | {monitor.uptimeRatio.last90Days !== null
              ? `${formatNumber(monitor.uptimeRatio.last90Days)}%`
              : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={monitor.status}
            label={t(`monitor.status.${monitor.status}` as const)}
          />
          
          {SHOW_LINKS && (
            <button
              type="button"
              onClick={() => {
                if (isProtectionEnabled && !isLoggedIn) {
                  onRequestLogin();
                  return;
                }
                window.open(
                  monitor.url.startsWith("http")
                    ? monitor.url
                    : `https://${monitor.url}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              className={`inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 shadow-sm transition ${
                isProtectionEnabled && !isLoggedIn
                  ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  : "bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
              title={isProtectionEnabled && !isLoggedIn ? t("auth.loginPrompt") : t("monitor.viewSite")}
              aria-label={isProtectionEnabled && !isLoggedIn ? t("auth.loginPrompt") : t("monitor.viewSite")}
            >
              {isProtectionEnabled && !isLoggedIn ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              ) : (
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
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-2 text-xs text-slate-500">
        {monitor.lastCheckedAt
          ? dayjs(monitor.lastCheckedAt).format("YYYY-MM-DD HH:mm")
          : ""}
      </div>
    </div>
  );
}