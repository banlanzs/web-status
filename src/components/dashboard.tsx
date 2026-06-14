"use client";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { TopNav } from "@/components/top-nav";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useMonitors } from "@/components/providers/monitors-provider";
import { LoadingOverlay } from "@/components/loading";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { formatNumber, formatDuration } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { LoginModal } from "@/components/login-modal";

const DEFAULT_REFRESH_SECONDS = Number(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS ?? 300,
);

const STATUS_DAYS = Number(
  process.env.NEXT_PUBLIC_STATUS_DAYS ?? 45,
);

type FilterType = "all" | "up" | "warn" | "down" | "pause";

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
  const { t, language } = useLanguage();
  const { monitors, isLoading, error, refresh, lastUpdated } = useMonitors();
  const { isLoggedIn, isProtectionEnabled } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(refreshInterval);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const displayMonitors = monitors.length > 0 ? monitors : initialMonitors;
  const displayError = error || initialError;

  useEffect(() => {
    setSecondsLeft(refreshInterval);
  }, [refreshInterval, lastUpdated]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refresh(true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, refresh]);

  const handleForceRefresh = async () => {
    await refresh(false);
  };

  const summary = useMemo(() => {
    const total = displayMonitors.length;
    const up = displayMonitors.filter((m) => m.status === "up").length;
    const down = displayMonitors.filter((m) => m.status === "down").length;
    const paused = displayMonitors.filter((m) => m.status === "paused").length;
    return { total, up, down, paused };
  }, [displayMonitors]);

  const hasIssues = summary.down > 0;

  const summaryTagline = useMemo(() => {
    if (summary.total === 0) return t("app.taglineUnknown");
    if (summary.down === summary.total) return t("app.taglineDown");
    if (summary.down > 0) return t("app.taglineIssues");
    if (summary.paused === summary.total) return t("app.taglineUnknown");
    return t("app.taglineOperational");
  }, [summary, t]);

  const overallStatus = useMemo(() => {
    if (summary.total === 0) return "unknown";
    if (summary.down === summary.total) return "down";
    if (summary.down > 0) return "down";
    if (summary.paused === summary.total) return "paused";
    return "up";
  }, [summary]);

  const formattedUpdatedAt = useMemo(
    () => dayjs(lastUpdated || fetchedAt).format("HH:mm"),
    [lastUpdated, fetchedAt],
  );

  const formattedCountdown = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    if (minutes > 0) {
      return `${minutes}m${seconds}s`;
    }
    return `${seconds}s`;
  }, [secondsLeft]);

  // 筛选后的监控列表
  const filteredMonitors = useMemo(() => {
    if (currentFilter === "all") return displayMonitors;
    return displayMonitors.filter((m) => {
      if (currentFilter === "warn") return m.status === "down" && m.uptimeRatioLast90Days !== null && m.uptimeRatioLast90Days >= 50;
      return m.status === currentFilter;
    });
  }, [displayMonitors, currentFilter]);

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

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (hasIssue) {
        ctx.beginPath();
        ctx.moveTo(16, 9);
        ctx.lineTo(16, 17);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(16, 21, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(10, 16);
        ctx.lineTo(14, 20);
        ctx.lineTo(22, 12);
        ctx.stroke();
      }

      const oldLink = document.getElementById(faviconId);
      if (oldLink) oldLink.remove();

      const link = document.createElement("link");
      link.id = faviconId;
      link.rel = "icon";
      link.type = "image/png";
      link.href = canvas.toDataURL();
      document.head.appendChild(link);
    };

    updateFavicon(hasIssues ? "#eab308" : "#17a34a", hasIssues);

    const statusEmoji = hasIssues ? "⚠️" : "✅";
    document.title = `${statusEmoji} ${originalTitle}`;

    return () => {
      const link = document.getElementById(faviconId);
      if (link) link.remove();
      document.title = originalTitle;
    };
  }, [hasIssues, t]);

  return (
    <div className="min-h-screen bg-bg">
      <TopNav onRequestLogin={() => setIsLoginModalOpen(true)} />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <div className={`status-hero ${hasIssues ? "has-issues" : ""}`}>
              <div className="hero-top">
                <div>
                  <p className="eyebrow">PUBLIC STATUS · WEB STATUS</p>
                  <StatusBadge status={overallStatus as any} label={summaryTagline} />
                  <h1 style={{ marginTop: "var(--space-5)" }}>
                    {summaryTagline}
                  </h1>
                  <p className="lead" style={{ marginTop: "var(--space-5)", maxWidth: "62ch", color: "var(--muted)", fontSize: "var(--text-lg)" }}>
                    {t("app.monitorsSummary", {
                      total: summary.total,
                      up: summary.up,
                      down: summary.down,
                      paused: summary.paused,
                    })}
                  </p>
                </div>
                <div className="badge" aria-live="polite">
                  <span>{t("app.nextRefresh", { seconds: formattedCountdown })}</span>
                  {refreshInterval > 0 ? (
                    <button
                      type="button"
                      onClick={handleForceRefresh}
                      disabled={isLoading}
                      className="btn btn-small"
                      title={isLoading ? t("controls.refreshing") : t("controls.refresh")}
                      style={{ marginLeft: "var(--space-2)" }}
                    >
                      <svg
                        className={isLoading ? "animate-spin" : ""}
                        style={{ height: "16px", width: "16px" }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="hero-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
                <div className="stat-card">
                  <span className="stat-value">{summary.total}</span>
                  <div className="stat-label">{language === "zh" ? "监控总数" : "Total"}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{summary.up}</span>
                  <div className="stat-label">{language === "zh" ? "运行正常" : "Operational"}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{summary.down}</span>
                  <div className="stat-label">{language === "zh" ? "异常" : "Down"}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{formattedUpdatedAt}</span>
                  <div className="stat-label">{language === "zh" ? "最后更新" : "Updated"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LoadingOverlay show={isLoading} />

        {/* Monitor List */}
        <section style={{ padding: "var(--space-8) 0 var(--section-y-desktop)" }}>
          <div className="container">
            {displayError ? (
              <div style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid color-mix(in oklab, var(--danger), var(--border) 68%)",
                background: "color-mix(in oklab, var(--danger), var(--surface) 88%)",
                padding: "var(--space-6)",
                color: "var(--danger)"
              }}>
                {displayError}
              </div>
            ) : null}

            {displayMonitors.length === 0 ? (
              <div style={{
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                padding: "var(--space-12)",
                textAlign: "center",
                color: "var(--muted)"
              }}>
                {t("app.empty")}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                  <div>
                    <p className="eyebrow">MONITORS</p>
                    <h2>{language === "zh" ? "公开服务状态" : "Public service status"}</h2>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }} role="group" aria-label="Monitor filters">
                    {(["all", "up", "down", "pause"] as FilterType[]).map((filter) => (
                      <button
                        key={filter}
                        className={`btn btn-small ${currentFilter === filter ? "btn-primary" : ""}`}
                        type="button"
                        onClick={() => setCurrentFilter(filter)}
                      >
                        {filter === "all" ? (language === "zh" ? "全部" : "All") :
                         filter === "up" ? "Up" :
                         filter === "down" ? "Down" :
                         "Paused"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gap: "var(--space-4)" }}>
                  {filteredMonitors.map((monitor) => (
                    <MonitorListItem
                      key={monitor.id}
                      monitor={monitor}
                      onRequestLogin={() => setIsLoginModalOpen(true)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
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

function MonitorListItem({ monitor, onRequestLogin }: MonitorListItemProps) {
  const { t, language } = useLanguage();
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

  const createDate = monitor.createDatetime ? dayjs.unix(monitor.createDatetime) : dayjs();
  const lastLog = [...monitor.logs].sort((a, b) => dayjs(a.datetime).valueOf() - dayjs(b.datetime).valueOf()).pop();
  const lastLogTime = lastLog ? dayjs(lastLog.datetime) : createDate;

  const dayData = Array.from({ length: segments }, (_, index) => {
    const date = dayjs().subtract(segments - 1 - index, "day");
    const dateStr = date.format("YYYY-MM-DD");
    const today = dayjs().format("YYYY-MM-DD");
    const isAfterCreate = date.isSameOrAfter(createDate, "day");

    if (!isAfterCreate) {
      return { date: dateStr, color: "pause", status: "nodata", uptime: -1, hasData: false };
    }

    const dayStart = date.startOf("day").unix();
    const dayEnd = date.endOf("day").unix();
    let downDuration = 0;
    let pausedDuration = 0;
    let hasDownLog = false;

    monitor.logs.forEach((log) => {
      const logStart = dayjs(log.datetime).unix();
      const logEnd = logStart + (log.duration || 0);
      if (logStart < dayEnd && logEnd > dayStart) {
        const overlapStart = Math.max(logStart, dayStart);
        const overlapEnd = Math.min(logEnd, dayEnd);
        const duration = Math.max(0, overlapEnd - overlapStart);
        if (log.type === 1) {
          downDuration += duration;
          hasDownLog = true;
        } else if (log.type === 99) {
          pausedDuration += duration;
        }
      }
    });

    const isToday = dateStr === today;
    let daySeconds = isToday
      ? Math.max(0, Math.min(dayjs().diff(date.startOf("day"), "second"), 86400))
      : 86400;

    let uptime = 100;
    if (daySeconds > 0) {
      const monitoredTime = Math.max(0, daySeconds - pausedDuration);
      uptime = monitoredTime === 0 ? 0 : Math.max(0, (monitoredTime - downDuration) / monitoredTime) * 100;
    }

    let color = "up";
    if (dateStr > today) {
      color = "pause";
    } else if (pausedDuration > 86000) {
      color = "pause";
    } else if (hasDownLog) {
      if (dateStr === today && monitor.status === "down") {
        color = "down";
      } else if (uptime < 50) {
        color = "down";
      } else if (uptime < 95) {
        color = "warn";
      } else {
        color = "up";
      }
    }

    if (monitor.status === "paused" && date.isAfter(lastLogTime, "day")) {
      color = "pause";
    }

    return { date: dateStr, color, status: color, uptime, hasData: true };
  });

  const tooltipForDay = (day: any) => {
    if (day.status === "pause") return `${day.date} - ${language === "zh" ? "已暂停" : "Paused"}`;
    if (day.status === "nodata") return language === "zh" ? "无数据" : "No data";
    return `${day.date} - ${formatNumber(day.uptime)}%`;
  };

  return (
    <article className={`monitor-card ${monitor.status}`}>
      <div className="monitor-main">
        <div className="monitor-title">
          <span className="dot"></span>
          <Link href={`/monitor/${monitor.id}`} prefetch={false}>
            {monitor.name}
          </Link>
        </div>
      </div>
      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        <div className="history-meta">
          <span>{segments} {language === "zh" ? "天" : "days"}</span>
          <strong style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
            {monitor.uptimeRatioLast90Days !== null
              ? `${formatNumber(monitor.uptimeRatioLast90Days)}%`
              : "—"}
          </strong>
        </div>
        <div ref={barRef} className="days" onClick={() => setActiveIndex(null)}>
          {dayData.map((day, index) => (
            <span
              key={`${monitor.id}-${index}`}
              className={`day ${day.color}`}
              title={tooltipForDay(day)}
              onClick={(e) => {
                e.stopPropagation();
                activateSegment(e.currentTarget as HTMLDivElement, index);
              }}
            />
          ))}
        </div>
        {activeIndex !== null && tooltipPos !== null && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: tooltipPos,
              transform: "translateX(-50%)",
              marginBottom: "8px",
              pointerEvents: "none",
              zIndex: 50,
            }}
          >
            <div style={{
              whiteSpace: "nowrap",
              borderRadius: "var(--radius-md)",
              background: "var(--fg)",
              color: "var(--surface)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-mono)",
            }}>
              {tooltipText}
            </div>
          </div>
        )}
      </div>
      <div className="card-actions">
        <span className={`badge ${monitor.status}`}>
          <span className="dot"></span>
          {t(`monitor.status.${monitor.status}` as const)}
        </span>
        {SHOW_LINKS && isLoggedIn ? (
          <a
            href={monitor.url.startsWith("http") ? monitor.url : `https://${monitor.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 shadow-sm transition bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            style={{ textDecoration: "none" }}
            title={t("monitor.viewSite")}
            aria-label={t("monitor.viewSite")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ height: "16px", width: "16px" }}>
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
          </a>
        ) : SHOW_LINKS && isProtectionEnabled && !isLoggedIn ? (
          <button
            type="button"
            onClick={onRequestLogin}
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 shadow-sm transition bg-slate-100 text-slate-400 hover:bg-slate-200"
            title={t("auth.loginPrompt")}
            aria-label={t("auth.loginPrompt")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ height: "16px", width: "16px" }}>
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </button>
        ) : null}
        <Link className="btn btn-primary btn-small" href={`/monitor/${monitor.id}`}>
          {language === "zh" ? "查看详情" : "Details"}
        </Link>
      </div>
    </article>
  );
}
