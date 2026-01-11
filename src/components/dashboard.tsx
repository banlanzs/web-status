"use client";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useMonitors } from "@/components/providers/monitors-provider";
import { LoadingOverlay } from "@/components/loading";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { formatNumber, formatDuration } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { LoginModal } from "@/components/login-modal";
import { MonitorGroupComponent } from "@/components/monitor-group";
import { groupMonitors } from "@/config/monitor-groups";

const DEFAULT_REFRESH_SECONDS = Number(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS ?? 300,
);

interface DashboardProps {
  monitors: NormalizedMonitor[];
  fetchedAt: string;
  refreshInterval?: number;
  errorMessage?: string | null;
}

export function Dashboard({
  monitors: initialMonitors,
  fetchedAt,
  refreshInterval = DEFAULT_REFRESH_SECONDS,
  errorMessage: initialError,
}: DashboardProps) {
  const { t } = useLanguage();
  const { monitors, isLoading, error, refresh, lastUpdated } = useMonitors();
  const { isLoggedIn, isProtectionEnabled, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(refreshInterval);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showGrouped, setShowGrouped] = useState(true); // 新增：控制分组显示

  // 使用 Provider 的数据，如果 Provider 没有数据则使用初始数据
  const displayMonitors = monitors.length > 0 ? monitors : initialMonitors;
  const displayError = error || initialError;

  // 分组数据
  const { groups, ungrouped } = groupMonitors(displayMonitors);

  // 当 lastUpdated 变化时，重置倒计时（包括自动刷新和手动刷新）
  useEffect(() => {
    setSecondsLeft(refreshInterval);
  }, [refreshInterval, lastUpdated]);

  // 自动刷新倒计时
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refresh(true); // 自动刷新使用强制真刷新，跳过30秒限制
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, refresh]);

  // 手动刷新函数
  const handleForceRefresh = async () => {
    await refresh(false); // 手动刷新受30秒限制（无论上次刷新是手动还是自动）
    // 不需要手动设置 setSecondsLeft，因为真刷新时 lastUpdated 变化会触发 useEffect 重置倒计时
  };

  const summary = useMemo(() => {
    const total = displayMonitors.length;
    const up = displayMonitors.filter((monitor) => monitor.status === "up").length;
    const down = displayMonitors.filter((monitor) => monitor.status === "down").length;
    const paused = displayMonitors.filter(
      (monitor) => monitor.status === "paused",
    ).length;
    return { total, up, down, paused };
  }, [displayMonitors]);

  const summaryTagline = useMemo(() => {
    if (summary.total === 0) return t("app.taglineUnknown");
    if (summary.down === summary.total) return t("app.taglineDown");
    if (summary.down > 0) return t("app.taglineIssues");
    if (summary.paused === summary.total) return t("app.taglineUnknown");
    return t("app.taglineOperational");
  }, [summary, t]);

  const overallStatus =
    summary.total === 0
      ? "unknown"
      : summary.down === summary.total
        ? "down"
        : summary.down > 0
          ? "down"
          : summary.paused === summary.total
            ? "paused"
            : "up";

  const formattedUpdatedAt = useMemo(
    () => dayjs(lastUpdated || fetchedAt).format("YYYY-MM-DD HH:mm:ss"),
    [lastUpdated, fetchedAt],
  );

  // 判断是否有问题（有down状态的监控）
  const hasIssues = summary.down > 0;
  const bgGradientStyle = hasIssues
    ? "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95))"
    : "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.95))";

  // 动态更新favicon和页面标题
  useEffect(() => {
    const faviconId = "dynamic-favicon";
    const originalTitle = t("app.name");

    const updateFavicon = (color: string, hasIssue: boolean) => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 绘制圆形背景
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fill();

      // 绘制图标
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (hasIssue) {
        // 绘制感叹号
        ctx.beginPath();
        ctx.moveTo(16, 9);
        ctx.lineTo(16, 17);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(16, 21, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
      } else {
        // 绘制对号
        ctx.beginPath();
        ctx.moveTo(10, 16);
        ctx.lineTo(14, 20);
        ctx.lineTo(22, 12);
        ctx.stroke();
      }

      // 移除旧的动态 favicon（如果存在）
      const oldLink = document.getElementById(faviconId);
      if (oldLink) {
        oldLink.remove();
      }

      // 创建新的 favicon 链接
      const link = document.createElement("link");
      link.id = faviconId;
      link.rel = "icon";
      link.type = "image/png";
      link.href = canvas.toDataURL();
      document.head.appendChild(link);
    };

    updateFavicon(hasIssues ? "#fbbf24" : "#10b981", hasIssues);

    // 更新页面标题，添加状态指示
    const statusEmoji = hasIssues ? "⚠️" : "✅";
    document.title = `${statusEmoji} ${originalTitle}`;

    // 清理函数：当组件卸载时，移除动态添加的 favicon 并恢复原始标题
    return () => {
      const link = document.getElementById(faviconId);
      if (link) {
        link.remove();
      }
      document.title = originalTitle;
    };
  }, [hasIssues, t]);

  return (
    <div className="min-h-screen bg-slate-100">
      <section
        className="relative overflow-hidden pb-32 pt-16 text-white transition-colors duration-500"
        style={{ background: bgGradientStyle }}
      >
        {/* 动态波浪效果 */}
        <div className="absolute inset-0 opacity-20 overflow-hidden">
          <div className="wave-animation" style={{ width: "200%", height: "100%", display: "flex" }}>
            <svg
              className="h-full"
              style={{ width: "50%", flexShrink: 0 }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 800 400"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M0 200 Q200 100 400 200 T800 200 V400 H0 Z"
                fill="url(#waveGradient1)"
                opacity="0.6"
              />
              <defs>
                <linearGradient id="waveGradient1" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#fff" stopOpacity="0.7" offset="0%" />
                  <stop stopColor="#fff" stopOpacity="0" offset="100%" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              className="h-full"
              style={{ width: "50%", flexShrink: 0 }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 800 400"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M0 200 Q200 100 400 200 T800 200 V400 H0 Z"
                fill="url(#waveGradient2)"
                opacity="0.6"
              />
              <defs>
                <linearGradient id="waveGradient2" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#fff" stopOpacity="0.7" offset="0%" />
                  <stop stopColor="#fff" stopOpacity="0" offset="100%" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-white/90 drop-shadow-sm">
                {t("app.name")}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl drop-shadow-md">
                {summaryTagline}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {refreshInterval > 0 ? (
                <button
                  type="button"
                  onClick={handleForceRefresh}
                  className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30 disabled:opacity-50"
                  disabled={isLoading}
                  aria-label={isLoading ? t("controls.refreshing") : t("controls.refresh")}
                  title={isLoading ? t("controls.refreshing") : t("controls.refresh")}
                >
                  <svg
                    className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              ) : null}
              
              {/* 分组切换按钮 */}
              <button
                type="button"
                onClick={() => setShowGrouped(!showGrouped)}
                className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label={showGrouped ? "显示列表视图" : "显示分组视图"}
                title={showGrouped ? "显示列表视图" : "显示分组视图"}
              >
                {showGrouped ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5" />
                  </svg>
                )}
              </button>
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label="GitHub"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>

              {/* Auth Button */}
              {isProtectionEnabled ? (
                <button
                  onClick={() => isLoggedIn ? logout() : setIsLoginModalOpen(true)}
                  className={`rounded-full p-2 transition hover:bg-white/30 ${isLoggedIn ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                    }`}
                  aria-label={isLoggedIn ? t("auth.logout") : t("auth.loginTitle")}
                  title={isLoggedIn ? t("auth.logout") : t("auth.loginTitle")}
                >
                  {isLoggedIn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ) : null}
              <LanguageSwitcher />
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm text-white/80 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <StatusBadge status={overallStatus} label={summaryTagline} />
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-center truncate">
              {t("app.lastUpdated", { time: formattedUpdatedAt })}
            </span>
            {refreshInterval > 0 ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-center whitespace-nowrap">
                {(() => {
                  const minutes = Math.floor(secondsLeft / 60);
                  const seconds = secondsLeft % 60;
                  if (minutes > 0) {
                    return t("app.nextRefresh", { seconds: `${minutes}分${seconds}秒` });
                  }
                  return t("app.nextRefresh", { seconds: `${seconds}秒` });
                })()}
              </span>
            ) : null}
            <span className="rounded-full bg-white/10 px-3 py-1 text-center whitespace-nowrap">
              {t("app.monitorsSummary", {
                total: summary.total,
                up: summary.up,
                down: summary.down,
                paused: summary.paused,
              })}
            </span>
          </div>
        </div>
      </section>

      <LoadingOverlay show={isLoading} />

      <main className="mt-8 space-y-6 pb-24">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6">
          {displayError ? (
            <div className="rounded-3xl border border-danger/40 bg-danger/10 p-6 text-danger-foreground shadow-soft">
              {displayError || t("errors.failed")}
            </div>
          ) : null}

          {displayMonitors.length === 0 ? (
            <div className="rounded-3xl bg-white/70 p-12 text-center text-slate-500 shadow-soft">
              {t("app.empty")}
            </div>
          ) : showGrouped ? (
            // 分组视图
            <div className="space-y-6">
              {/* 显示分组 */}
              {groups.map(({ group, monitors: groupMonitors }) => (
                <MonitorGroupComponent
                  key={group.id}
                  group={group}
                  monitors={groupMonitors}
                  onRequestLogin={() => setIsLoginModalOpen(true)}
                />
              ))}
              
              {/* 显示未分组的监控 */}
              {ungrouped.length > 0 && (
                <section className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    其他服务
                  </h2>
                  <div className="space-y-3">
                    {ungrouped.map((monitor) => (
                      <MonitorListItem
                        key={monitor.id}
                        monitor={monitor}
                        onRequestLogin={() => setIsLoginModalOpen(true)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            // 列表视图（原来的显示方式）
            <section className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Services
              </h2>
              <div className="space-y-3">
                {displayMonitors.map((monitor) => (
                  <MonitorListItem
                    key={monitor.id}
                    monitor={monitor}
                    onRequestLogin={() => setIsLoginModalOpen(true)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}

interface MonitorListItemProps {
  monitor: NormalizedMonitor;
  onRequestLogin: () => void;
}

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

const STATUS_DAYS = Number(
  process.env.NEXT_PUBLIC_STATUS_DAYS ?? 60,
);

function MonitorListItem({ monitor, onRequestLogin }: MonitorListItemProps) {
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60">
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
            |
            {" "}
            {monitor.uptimeRatio.last90Days !== null
              ? `${formatNumber(monitor.uptimeRatio.last90Days)}%`
              : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={monitor.status}
            label={t(`monitor.status.${monitor.status}` as const)}
          />

          {SHOW_LINKS ? (
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
              className={`inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 shadow-sm transition ${isProtectionEnabled && !isLoggedIn
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
          ) : null}
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
