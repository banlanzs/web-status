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
            <GroupMonitorItem
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

// 分组内的监控项组件（包含完整的状态条）
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import Link from "next/link";
import { useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { formatNumber, formatDuration } from "@/lib/utils";

const SHOW_LINKS = process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" && 
                  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";
const STATUS_DAYS = Number(process.env.NEXT_PUBLIC_STATUS_DAYS ?? 60);

interface GroupMonitorItemProps {
  monitor: NormalizedMonitor;
  onRequestLogin: () => void;
}

function GroupMonitorItem({ monitor, onRequestLogin }: GroupMonitorItemProps) {
  const { t } = useLanguage();
  const { isLoggedIn, isProtectionEnabled } = useAuth();
  const segments = STATUS_DAYS;
  const barRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<number | null>(null);
  const [tooltipText, setTooltipText] = useState<string>("");

  const activateSegment = (el: HTMLDivElement, index: number) => {
    const containerRect = barRef.current?.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (!containerRect) return;
    if (activeIndex === index) {
      setActiveIndex(null);
      return;
    }
    const center = rect.left - containerRect.left + rect.width / 2;
    const min = 8;
    const max = Math.max(min, containerRect.width - 8);
    setActiveIndex(index);
    setTooltipPos(Math.max(min, Math.min(max, center)));
    setTooltipText(el.getAttribute("title") || "");
  };

  // 计算监控创建日期（如果有）
  const createDate = monitor.createDatetime ? dayjs.unix(monitor.createDatetime) : dayjs();

  // 获取最近一次状态变更日志，作为推断暂停状态的起点
  const lastLog = [...monitor.logs].sort((a, b) => dayjs(a.datetime).valueOf() - dayjs(b.datetime).valueOf()).pop();
  const lastLogTime = lastLog ? dayjs(lastLog.datetime) : createDate;

  // 为每一天构建状态数据
  const dayData = Array.from({ length: segments }, (_, index) => {
    const date = dayjs().subtract(segments - 1 - index, "day");
    const dateStr = date.format("YYYY-MM-DD");
    const today = dayjs().format("YYYY-MM-DD");

    // 检查这一天是否在监控创建之后
    const isAfterCreate = date.isSameOrAfter(createDate, "day");

    // 如果不在创建日期之后，标记为无数据
    if (!isAfterCreate) {
      return {
        date: dateStr,
        color: "bg-slate-300", // 灰色表示无数据
        status: "nodata",
        hasDownLog: false,
        downDuration: 0,
        uptime: -1, // -1 表示无数据
        incidentCount: 0,
        hasData: false, // 标记为无数据
        pausedDuration: 0,
      };
    }

    // 计算当天的开始和结束时间戳
    const dayStart = date.startOf("day").unix();
    const dayEnd = date.endOf("day").unix();

    let downDuration = 0;
    let pausedDuration = 0;
    let incidentCount = 0;
    let hasDownLog = false;
    let hasPausedLog = false;

    // 检查所有与该天重叠的日志
    monitor.logs.forEach((log) => {
      const logStart = dayjs(log.datetime).unix();
      const logEnd = logStart + (log.duration || 0);

      // 检查日志时间范围是否与当天有重叠
      if (logStart < dayEnd && logEnd > dayStart) {
        // 计算重叠部分的时长
        const overlapStart = Math.max(logStart, dayStart);
        const overlapEnd = Math.min(logEnd, dayEnd);
        const duration = Math.max(0, overlapEnd - overlapStart);

        if (log.type === 1 || log.type === 99) {
          incidentCount++;
        }

        if (log.type === 1) {
          // Down 类型
          downDuration += duration;
          hasDownLog = true;
        } else if (log.type === 99) {
          // Paused 类型
          pausedDuration += duration;
          hasPausedLog = true;
        }
      }
    });

    // 计算当天可用率
    const isToday = dateStr === dayjs().format("YYYY-MM-DD");
    let daySeconds: number;

    if (isToday) {
      // 今天:只计算已经过去的时间
      const now = dayjs();
      const elapsedSeconds = now.diff(date.startOf("day"), 'second');
      daySeconds = Math.max(0, Math.min(elapsedSeconds, 86400));
    } else {
      // 过去的日子:完整的24小时
      daySeconds = 86400;
    }

    let uptime = 100;

    if (daySeconds > 0) {
      // 监控时间 = 总时间 - 暂停时间
      const monitoredTime = Math.max(0, daySeconds - pausedDuration);
      if (monitoredTime === 0) {
        // 全天暂停
        uptime = 0;
      } else {
        // 可用率 = (监控时间 - 故障时间) / 监控时间
        uptime = Math.max(0, (monitoredTime - downDuration) / monitoredTime) * 100;
      }
    }

    // 确定颜色和状态
    let color = "bg-emerald-500"; // 默认正常
    let status = "normal";

    if (dateStr > today) {
      // 未来日期显示为灰色
      color = "bg-slate-300";
      status = "future";
    } else if (pausedDuration > 86000) {
      // 大部分时间暂停（超过23小时56分）
      color = "bg-slate-400";
      status = "paused";
    } else if (hasDownLog) {
      // 如果是今天且当前监控状态是down，显示红色
      if (dateStr === today && monitor.status === "down") {
        color = "bg-rose-500"; // 当前故障 - 红色
        status = "down";
      } else if (uptime <= 30) {
        // 严重故障（可用率低于 30%）- 红色
        color = "bg-rose-500";
        status = "down";
      } else {
        // 轻微故障或已恢复的故障 - 黄色
        color = "bg-amber-500";
        status = "warning";
      }
    } else if (hasPausedLog && pausedDuration > 43200) {
      // 部分暂停但超过半天（12小时）
      color = "bg-slate-400";
      status = "paused";
    }

    // 如果监控当前是暂停状态（status === "paused"），且该日期在最后一条日志（或创建日期）之后
    if (monitor.status === "paused" && date.isAfter(lastLogTime, "day")) {
      color = "bg-slate-400";
      status = "paused";
    }

    return {
      date: dateStr,
      color,
      status,
      hasDownLog,
      downDuration,
      uptime: status === "paused" ? -1 : uptime,
      incidentCount,
      hasData: true,
      pausedDuration,
    };
  });

  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/60">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/monitor/${monitor.id}`}
            prefetch={false}
            className="font-medium text-slate-900 hover:text-emerald-600 hover:underline text-left"
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div ref={barRef} className="relative flex-1" onClick={() => setActiveIndex(null)}>
          <div className="overflow-hidden rounded-lg bg-slate-200/80 px-2 py-2 sm:px-3">
            <div className="flex gap-0.5 sm:gap-[2px]">
              {dayData.map((day, index) => {
                const tooltipText = day.status === "future"
                  ? "未来日期"
                  : day.status === "nodata"
                    ? "无数据"
                    : day.status === "paused"
                      ? `${day.date} - 已暂停`
                      : `${day.date} - 可用率: ${day.uptime >= 0 ? formatNumber(day.uptime) + "%" : "—"}${day.hasDownLog ? ` | 故障次数: ${day.incidentCount} | 宕机时长: ${formatDuration(day.downDuration)}` : ''}`;

                return (
                  <div
                    key={`${monitor.id}-${index}`}
                    className={`h-6 min-w-[2px] sm:min-w-[3px] flex-1 rounded-sm ${day.color} cursor-pointer transition-opacity hover:opacity-80`}
                    title={tooltipText}
                    onClick={(e) => {
                      e.stopPropagation();
                      activateSegment(e.currentTarget, index);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      activateSegment(e.currentTarget, index);
                    }}
                  />
                );
              })}
            </div>
          </div>
          {activeIndex !== null && tooltipPos !== null && (
            <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 -translate-x-1/2" style={{ left: tooltipPos }}>
              <div className="whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-xl">
                {tooltipText}
              </div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
                <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-slate-900" />
              </div>
            </div>
          )}
        </div>
        <span className="whitespace-nowrap text-xs text-slate-500 sm:text-right">
          {monitor.lastCheckedAt
            ? dayjs(monitor.lastCheckedAt).format("YYYY-MM-DD HH:mm")
            : ""}
        </span>
      </div>
    </div>
  );
}