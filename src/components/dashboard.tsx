"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Footer } from "@/components/footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { formatNumber, formatDuration } from "@/lib/utils";
import type { NormalizedMonitor } from "@/types/uptimerobot";

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
  monitors,
  fetchedAt,
  refreshInterval = DEFAULT_REFRESH_SECONDS,
  errorMessage,
}: DashboardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(refreshInterval);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSecondsLeft(refreshInterval);
  }, [refreshInterval, fetchedAt]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          startTransition(() => {
            router.refresh();
          });
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, router]);

  const summary = useMemo(() => {
    const total = monitors.length;
    const up = monitors.filter((monitor) => monitor.status === "up").length;
    const down = monitors.filter((monitor) => monitor.status === "down").length;
    const paused = monitors.filter(
      (monitor) => monitor.status === "paused",
    ).length;
    return { total, up, down, paused };
  }, [monitors]);

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
    () => dayjs(fetchedAt).format("YYYY-MM-DD HH:mm:ss"),
    [fetchedAt],
  );

  // 判断是否有问题（有down状态的监控）
  const hasIssues = summary.down > 0;
  const bgGradientStyle = hasIssues
    ? "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95))"
    : "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.95))";

  // 动态更新favicon和页面标题
  useEffect(() => {
    const updateFavicon = (color: string) => {
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

      // 更新或创建favicon链接
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.type = "image/png";
      link.href = canvas.toDataURL();
    };

    updateFavicon(hasIssues ? "#fbbf24" : "#10b981");
    
    // 更新页面标题，添加状态指示
    const statusEmoji = hasIssues ? "⚠️" : "✅";
    document.title = `${statusEmoji} ${t("app.name")}`;
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
                  onClick={() =>
                    startTransition(() => {
                      router.refresh();
                      setSecondsLeft(refreshInterval);
                    })
                  }
                  className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30 disabled:opacity-50"
                  disabled={isPending}
                  aria-label={isPending ? t("controls.refreshing") : t("controls.refresh")}
                  title={isPending ? t("controls.refreshing") : t("controls.refresh")}
                >
                  <svg
                    className={`h-5 w-5 ${isPending ? "animate-spin" : ""}`}
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
                {t("app.nextRefresh", { seconds: secondsLeft })}
              </span>
            ) : null}
            <span className="rounded-full bg-white/10 px-3 py-1 text-center whitespace-nowrap">
              {t("app.monitorsSummary", {
                total: summary.total,
                up: summary.up,
                down: summary.down,
              })}
            </span>
          </div>
        </div>
      </section>

      <main className="mt-8 space-y-6 pb-24">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6">
          {errorMessage !== undefined && errorMessage !== null ? (
            <div className="rounded-3xl border border-danger/40 bg-danger/10 p-6 text-danger-foreground shadow-soft">
              {errorMessage || t("errors.failed")}
            </div>
          ) : null}

          {monitors.length === 0 ? (
            <div className="rounded-3xl bg-white/70 p-12 text-center text-slate-500 shadow-soft">
              {t("app.empty")}
            </div>
          ) : (
            <section className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Services
              </h2>
              <div className="space-y-3">
                {monitors.map((monitor) => (
                  <MonitorListItem key={monitor.id} monitor={monitor} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}

interface MonitorListItemProps {
  monitor: NormalizedMonitor;
}

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

const STATUS_DAYS = Number(
  process.env.NEXT_PUBLIC_STATUS_DAYS ?? 60,
);

function MonitorListItem({ monitor }: MonitorListItemProps) {
  const { t } = useLanguage();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const segments = STATUS_DAYS;

  // 为每一天构建状态数据
  const dayData = Array.from({ length: segments }, (_, index) => {
    const date = dayjs().subtract(segments - 1 - index, "day");
    const dateStr = date.format("YYYY-MM-DD");
    const today = dayjs().format("YYYY-MM-DD");
    
    // 检查该天是否有故障日志
    const dayLogs = monitor.logs.filter((log) => {
      const logDate = dayjs(log.datetime).format("YYYY-MM-DD");
      return logDate === dateStr;
    });
    
    const hasDownLog = dayLogs.some((log) => log.type === 1 || log.type === 99);
    const downDuration = dayLogs
      .filter((log) => log.type === 1 || log.type === 99)
      .reduce((sum, log) => sum + (log.duration || 0), 0);
    
    // 检查该天是否有响应时间数据
    const dayResponses = monitor.responseTimes.filter((rt) => {
      const rtDate = dayjs(rt.at).format("YYYY-MM-DD");
      return rtDate === dateStr;
    });
    
    const hasResponseData = dayResponses.length > 0;
    
    // 计算当天可用率：一天86400秒，减去宕机时长
    const daySeconds = 86400;
    const uptime = downDuration > 0 
      ? ((daySeconds - downDuration) / daySeconds) * 100
      : 100;
    
    // 确定颜色：优先根据日志判断，没有日志且在监控范围内则默认为正常
    let color = "bg-emerald-500"; // 默认正常
    let status = "normal";
    
    if (hasDownLog) {
      color = "bg-rose-500"; // 故障
      status = "down";
    } else if (dateStr > today) {
      // 未来日期显示为灰色
      color = "bg-slate-300";
      status = "future";
    }
    // 如果没有故障日志，即使没有响应数据也默认显示为绿色（正常）
    
    return {
      date: dateStr,
      color,
      status,
      hasResponseData,
      hasDownLog,
      downDuration,
      uptime,
      incidentCount: dayLogs.filter((log) => log.type === 1 || log.type === 99).length,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/monitor/${monitor.id}`}
            className="font-medium text-slate-900 hover:text-emerald-600 hover:underline"
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
        <div className="flex items-center gap-3">
          <StatusBadge
            status={monitor.status}
            label={t(`monitor.status.${monitor.status}` as const)}
          />
          {SHOW_LINKS ? (
            <button
              type="button"
              onClick={() => {
                window.open(
                  monitor.url.startsWith("http")
                    ? monitor.url
                    : `https://${monitor.url}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-600 shadow-sm transition hover:bg-emerald-50"
            >
              {t("monitor.viewSite")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 overflow-visible rounded-lg bg-slate-200/80 px-3 py-2">
          <div className="flex gap-[2px]">
            {dayData.map((day, index) => (
              <div
                key={index}
                className={`relative h-6 flex-1 rounded ${day.color} cursor-pointer transition-opacity hover:opacity-80`}
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {hoveredBar === index && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-3 text-xs text-white shadow-xl">
                    <div className="font-semibold">{day.date}</div>
                    <div className="mt-1.5 space-y-1 text-slate-200">
                      {day.status === "future" ? (
                        <div className="text-slate-400">未来日期</div>
                      ) : (
                        <>
                          <div className={day.hasDownLog ? "text-rose-300" : "text-emerald-300"}>
                            可用率: {formatNumber(day.uptime)}%
                          </div>
                          {day.hasDownLog && (
                            <>
                              {day.incidentCount > 0 && (
                                <div>故障次数: {day.incidentCount}</div>
                              )}
                              {day.downDuration > 0 && (
                                <div>
                                  宕机时长: {formatDuration(day.downDuration)}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <span className="whitespace-nowrap text-xs text-slate-500">
          {monitor.lastCheckedAt
            ? dayjs(monitor.lastCheckedAt).format("YYYY-MM-DD HH:mm")
            : ""}
        </span>
      </div>
    </div>
  );
}

