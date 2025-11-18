"use client";

import dayjs from "dayjs";
import { useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn, formatDuration } from "@/lib/utils";
import type { DailyStatus } from "@/types/uptimerobot";

interface UptimeBarProps {
  dailyStatus: DailyStatus[];
  className?: string;
}

export function UptimeBar({ dailyStatus, className }: UptimeBarProps) {
  const { t } = useLanguage();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [clickedDay, setClickedDay] = useState<number | null>(null);

  // 根据正常运行时间百分比和故障记录获取状态类型
  const getStatusType = (day: DailyStatus): "normal" | "warn" | "error" | "unknown" | "paused" => {
    // 1. 无数据
    if (day.uptime < 0) return "unknown";

    // 2. 暂停
    if (day.pause && (day.pause.duration > 0 || day.pause.times > 0)) {
      return "paused";
    }

    // 3. 宕机
    if (day.down.times > 0 || day.down.duration > 0) {
      if (day.uptime < 90) return "error";
      return "warn";
    }

    // 4. 正常
    return "normal";
  };

  // 处理点击事件（移动端）
  const handleDayClick = (index: number) => {
    setClickedDay(clickedDay === index ? null : index);
  };

  // 点击外部关闭提示
  const handleClickOutside = () => {
    setClickedDay(null);
  };

  // 状态颜色映射 - 使用更鲜艳的颜色
  const statusColors = {
    normal: "bg-emerald-400",
    warn: "bg-orange-400",
    error: "bg-red-500",
    unknown: "bg-gray-200",
    paused: "bg-gray-400",
  };

  return (
    <div className={cn("space-y-2", className)} onClick={handleClickOutside}>
      {/* 状态条 */}
      <div className="flex gap-[3px]">
        {dailyStatus.map((day, index) => {
          const status = getStatusType(day);
          const date = dayjs.unix(day.date);
          const isActive = hoveredDay === index || clickedDay === index;

          return (
            <div
              key={index}
              className="group relative flex-1"
              onMouseEnter={() => setHoveredDay(index)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleDayClick(index);
              }}
            >
              <div
                className={cn(
                  "h-10 rounded transition-all duration-150 cursor-pointer",
                  statusColors[status],
                  isActive && "transform scale-y-110 shadow-md ring-2 ring-slate-900/10",
                )}
              />
              
              {/* 悬停/点击提示 */}
              {isActive && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-xl">
                  <div className="font-semibold">
                    {date.format("YYYY-MM-DD")}
                  </div>
                  <div className="mt-0.5 text-slate-300">
                    {day.uptime < 0
                      ? t("monitor.noData")
                      : status === "paused"
                        ? `${t("monitor.status.paused")}${day.pause.duration > 0 ? ` · ${formatDuration(day.pause.duration)}` : ''}`
                        : day.down.times > 0
                          ? `${t("monitor.uptimePercent", { percent: day.uptime.toFixed(2) })} · ${day.down.times} 次故障 · ${formatDuration(day.down.duration)}`
                          : day.uptime === 0
                            ? "完全宕机 · 可用率 0%"
                            : t("monitor.uptimePercent", { percent: day.uptime.toFixed(2) })
                    }
                  </div>
                  {/* 箭头 */}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
                    <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-slate-900" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 时间标签 */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{dailyStatus.length > 0 ? dayjs.unix(dailyStatus[0].date).format("MM-DD") : ""}</span>
        <span>{t("monitor.today")}</span>
      </div>
    </div>
  );
}
