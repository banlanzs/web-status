"use client";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { TopNav } from "@/components/top-nav";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useMonitors } from "@/components/providers/monitors-provider";
import { LoadingOverlay } from "@/components/loading";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { formatNumber, formatDuration } from "@/lib/utils";
import { LoginModal } from "@/components/login-modal";
import { useAuth } from "@/components/providers/auth-provider";

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
    if (summary.total === 0) return "paused";
    if (summary.down === summary.total) return "down";
    if (summary.down > 0) return "degraded";
    if (summary.paused === summary.total) return "paused";
    return "up";
  }, [summary]) as "up" | "degraded" | "down" | "paused";

  const formattedUpdatedAt = useMemo(
    () => dayjs(lastUpdated || fetchedAt).format("YYYY-MM-DD HH:mm:ss"),
    [lastUpdated, fetchedAt],
  );

  const formattedCountdown = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(minutes)}:${pad(seconds)}`;
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopNav onRequestLogin={() => setIsLoginModalOpen(true)} overallStatus={overallStatus} />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero__bg" aria-hidden="true" />
          <div className="container hero__inner">
            <span className="hero__eyebrow">
              <span>PUBLIC STATUS · WEB STATUS</span>
            </span>
            <h1 className="hero__title">{summaryTagline}</h1>
            <p className="hero__lede">
              {t("app.monitorsSummary", {
                total: summary.total,
                up: summary.up,
                down: summary.down,
                paused: summary.paused,
              })}
            </p>

            <div className="hero__meta">
              <div>
                <span>Last updated</span> · <b>{formattedUpdatedAt}</b>
              </div>
              <div>
                <span>Next refresh in</span> · <b className="mono">{formattedCountdown}</b>
                {refreshInterval > 0 && (
                  <button
                    type="button"
                    onClick={handleForceRefresh}
                    disabled={isLoading}
                    className="btn btn--small btn--ghost"
                    title={isLoading ? t("controls.refreshing") : t("controls.refresh")}
                    style={{ marginLeft: "var(--space-2)", padding: "4px 8px" }}
                  >
                    <svg
                      className={isLoading ? "animate-spin" : ""}
                      style={{ height: "14px", width: "14px" }}
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
                )}
              </div>
              <div>
                <span>Monitors</span> · <b>{summary.total}</b>
              </div>
              <div>
                <span>Operational</span> · <b>{summary.up}</b>
              </div>
              {summary.down > 0 && (
                <div>
                  <span>Down</span> · <b style={{ color: "var(--status-down-fg)" }}>{summary.down}</b>
                </div>
              )}
            </div>
          </div>
        </section>

        <LoadingOverlay show={isLoading} />

        {/* Monitor List */}
        <section className="section">
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
                <div className="section__head">
                  <div>
                    <h2 className="section__title">
                      {language === "zh" ? "监控列表" : "Monitors"}
                    </h2>
                    <p className="body-muted body-sm">
                      {language === "zh" ? "90 天可用性 · 点击名称查看详情" : "90-day availability · click a name to view detail"}
                    </p>
                  </div>
                  <div className="legend" aria-label="Legend">
                    <span className="legend__item">
                      <span className="legend__sw" style={{ background: "var(--status-up-fg)" }} />
                      <span>{language === "zh" ? "正常" : "Operational"}</span>
                    </span>
                    <span className="legend__item">
                      <span className="legend__sw" style={{ background: "var(--status-down-fg)" }} />
                      <span>{language === "zh" ? "故障" : "Outage"}</span>
                    </span>
                    <span className="legend__item">
                      <span className="legend__sw" style={{ background: "var(--status-paused-fg)" }} />
                      <span>{language === "zh" ? "已暂停" : "Paused"}</span>
                    </span>
                  </div>
                </div>

                <div className="monitor-list">
                  {filteredMonitors.map((monitor) => (
                    <MonitorListItem
                      key={monitor.id}
                      monitor={monitor}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}

interface MonitorListItemProps {
  monitor: NormalizedMonitor;
}

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

function MonitorListItem({ monitor }: MonitorListItemProps) {
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
        color = "degraded";
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "up": return "badge--up";
      case "down": return "badge--down";
      case "paused": return "badge--paused";
      case "degraded": return "badge--degraded";
      default: return "";
    }
  };

  const getStatusCellClass = (color: string) => {
    switch (color) {
      case "degraded": return "status-bars__cell--degraded";
      case "down": return "status-bars__cell--down";
      case "pause": return "status-bars__cell--paused";
      default: return "";
    }
  };

  // 获取监控名称的前两个字符作为图标
  const monitorIcon = monitor.name.substring(0, 2).toUpperCase();

  return (
    <article className="monitor-card">
      <div className="monitor-card__head">
        <div className="monitor-card__icon" aria-hidden="true">{monitorIcon}</div>
        <div style={{ minWidth: 0 }}>
          <Link className="monitor-card__name" href={`/monitor/${monitor.id}`}>
            {monitor.name}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 12, height: 12, color: "var(--muted)" }}>
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="monitor-card__uptime">
        <span className={`badge ${getStatusBadgeClass(monitor.status)}`}>
          <span className="badge__dot" />
          {t(`monitor.status.${monitor.status}` as const)}
        </span>
        <span className="monitor-card__uptime-value">
          {monitor.uptimeRatioLast90Days !== null
            ? `${formatNumber(monitor.uptimeRatioLast90Days)}%`
            : "—"}
        </span>
        <span className="monitor-card__uptime-label">Uptime</span>
      </div>

      <div className="monitor-card__bars">
        <div className="monitor-card__bars-label">
          <span>{segments} {language === "zh" ? "天" : "days"}</span>
          <span>→</span>
        </div>
        <div ref={barRef} className="status-bars" onClick={() => setActiveIndex(null)}>
          {dayData.map((day, index) => (
            <div
              key={`${monitor.id}-${index}`}
              className={`status-bars__cell ${getStatusCellClass(day.color)}`}
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
              color: "var(--bg)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-mono)",
            }}>
              {tooltipText}
            </div>
          </div>
        )}
      </div>

      <div className="monitor-card__action">
        {SHOW_LINKS && (!isProtectionEnabled || isLoggedIn) ? (
          <a
            className="icon-btn"
            href={monitor.url.startsWith("http") ? monitor.url : `https://${monitor.url}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${language === "zh" ? "打开" : "Open"} ${monitor.name}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ) : null}
        <Link className="btn btn--primary btn--small" href={`/monitor/${monitor.id}`}>
          {language === "zh" ? "查看详情" : "Details"}
        </Link>
      </div>
    </article>
  );
}
