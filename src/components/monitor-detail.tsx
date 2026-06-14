"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense, useMemo } from "react";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

import { TopNav } from "@/components/top-nav";
import { LoginModal } from "@/components/login-modal";
import { StatusBadge } from "@/components/status-badge";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { formatDuration, formatNumber } from "@/lib/utils";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

interface MonitorDetailProps {
  monitor: NormalizedMonitor;
}

export function MonitorDetail({ monitor }: MonitorDetailProps) {
  const { t, language } = useLanguage();
  const { isLoggedIn, isProtectionEnabled } = useAuth();
  const statusLabel = t(`monitor.status.${monitor.status}` as const);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isMountedRef = useRef(true);
  const [visibleLogsCount, setVisibleLogsCount] = useState(5);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const LOGS_PER_PAGE = 10;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const sortedLogs = [...monitor.logs].sort((a, b) => {
    const timeDiff = dayjs(b.datetime).valueOf() - dayjs(a.datetime).valueOf();
    if (timeDiff !== 0) return timeDiff;
    if (a.type === 99 && b.type === 2) return -1;
    if (a.type === 2 && b.type === 99) return 1;
    if (a.type === 98 && b.type === 99) return -1;
    if (a.type === 99 && b.type === 98) return 1;
    return 0;
  });

  const visibleLogs = sortedLogs.slice(0, visibleLogsCount);
  const hasMoreLogs = visibleLogsCount < sortedLogs.length;

  const loadMoreLogs = () => {
    if (!isMountedRef.current) return;
    setIsLoadingLogs(true);
    setTimeout(() => {
      if (isMountedRef.current) {
        setVisibleLogsCount(prev => prev + LOGS_PER_PAGE);
        setIsLoadingLogs(false);
      }
    }, 300);
  };

  const createDate = monitor.createDatetime ? dayjs.unix(monitor.createDatetime) : null;
  const monitorLink = monitor.url.startsWith("http") ? monitor.url : `https://${monitor.url}`;

  const linkButton = isLoggedIn ? (
    <a
      href={monitorLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-full p-1.5 transition bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
      style={{ textDecoration: "none" }}
      title={t("monitor.viewSite")}
      aria-label={t("monitor.viewSite")}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ height: "16px", width: "16px" }}>
        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
      </svg>
    </a>
  ) : isProtectionEnabled ? (
    <button
      type="button"
      onClick={() => setIsLoginModalOpen(true)}
      className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 shadow-sm transition bg-slate-100 text-slate-400 hover:bg-slate-200"
      title={t("auth.loginPrompt")}
      aria-label={t("auth.loginPrompt")}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ height: "16px", width: "16px" }}>
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    </button>
  ) : null;

  const summaryCardBg = monitor.status === "down"
    ? "color-mix(in oklab, var(--danger), var(--surface) 88%)"
    : monitor.status === "paused"
      ? "color-mix(in oklab, var(--meta), var(--surface) 88%)"
      : "color-mix(in oklab, var(--success), var(--surface) 88%)";

  const summaryCardBorder = monitor.status === "down"
    ? "color-mix(in oklab, var(--danger), var(--border) 72%)"
    : monitor.status === "paused"
      ? "color-mix(in oklab, var(--meta), var(--border) 72%)"
      : "color-mix(in oklab, var(--success), var(--border) 72%)";

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
          <p className="mt-4 text-muted">{language === "zh" ? "加载中..." : "Loading..."}</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-bg">
        <TopNav onRequestLogin={() => setIsLoginModalOpen(true)} />

        <main>
          {/* Hero Section */}
          <section className="hero">
            <div className="container" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(280px, .7fr)", gap: "var(--space-8)", alignItems: "end" }}>
              <div>
                <p className="eyebrow">MONITOR DETAIL · {monitor.type.toUpperCase()}</p>
                <StatusBadge status={monitor.status} label={statusLabel} />
                <h1 style={{ marginTop: "var(--space-5)" }}>{monitor.name}</h1>
                <p style={{ marginTop: "var(--space-5)", maxWidth: "62ch", color: "var(--muted)", fontSize: "var(--text-lg)" }}>
                  {monitor.incidents.total > 0
                    ? language === "zh"
                      ? `过去 90 天有 ${monitor.incidents.total} 次事件，累计 ${formatDuration(monitor.incidents.totalDowntimeSeconds + monitor.incidents.totalPausedSeconds)}。`
                      : `${monitor.incidents.total} incidents in the past 90 days, ${formatDuration(monitor.incidents.totalDowntimeSeconds + monitor.incidents.totalPausedSeconds)} total.`
                    : language === "zh"
                      ? "过去 90 天无故障记录，服务运行正常。"
                      : "No incidents in the past 90 days. Service is operational."}
                </p>
              </div>
              <aside style={{
                background: summaryCardBg,
                border: `1px solid ${summaryCardBorder}`,
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-6)",
                boxShadow: "var(--elev-raised)",
              }}>
                <h3>{language === "zh" ? "服务摘要" : "Service summary"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
                  <div style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "color-mix(in oklab, var(--surface), transparent 10%)",
                    border: "1px solid var(--border)",
                  }}>
                    <strong style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {monitor.uptimeRatioLast90Days !== null
                        ? `${formatNumber(monitor.uptimeRatioLast90Days)}%`
                        : "—"}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                      {language === "zh" ? "90 天可用率" : "90-day uptime"}
                    </span>
                  </div>
                  <div style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "color-mix(in oklab, var(--surface), transparent 10%)",
                    border: "1px solid var(--border)",
                  }}>
                    <strong style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {monitor.responseTimes.length > 0
                        ? `${monitor.responseTimes[monitor.responseTimes.length - 1].value}ms`
                        : "—"}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                      {language === "zh" ? "当前响应" : "Current response"}
                    </span>
                  </div>
                  <div style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "color-mix(in oklab, var(--surface), transparent 10%)",
                    border: "1px solid var(--border)",
                  }}>
                    <strong style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {monitor.incidents.total}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                      {language === "zh" ? "近 90 天事件" : "90-day incidents"}
                    </span>
                  </div>
                  <div style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "color-mix(in oklab, var(--surface), transparent 10%)",
                    border: "1px solid var(--border)",
                  }}>
                    <strong style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {monitor.interval / 60}s
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                      {language === "zh" ? "刷新间隔" : "Refresh interval"}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {/* Content Section */}
          <section style={{ padding: "var(--space-8) 0 var(--section-y-desktop)" }}>
            <div className="container" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(310px, .75fr)", gap: "var(--space-6)", alignItems: "start" }}>
              {/* Response Time Chart */}
              {monitor.responseTimes.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">RESPONSE TIME</p>
                      <h2>{language === "zh" ? "响应时间趋势" : "Response trend"}</h2>
                    </div>
                  </div>
                  <ResponseTimeChart responseTimes={monitor.responseTimes} />
                </section>
              )}

              {/* Incident Log */}
              <aside className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">INCIDENTS</p>
                    <h2>{language === "zh" ? "事件日志" : "Incident log"}</h2>
                  </div>
                </div>
                {sortedLogs.length > 0 ? (
                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    {visibleLogs.map((log, index) => {
                      const logTime = dayjs(log.datetime);
                      const eventType = log.type === 1 ? "outage" : log.type === 2 ? "recovered" : "";
                      const typeLabel = log.type === 1
                        ? (language === "zh" ? "宕机" : "Down")
                        : log.type === 2
                          ? (language === "zh" ? "恢复" : "Recovered")
                          : log.type === 99
                            ? (language === "zh" ? "暂停" : "Paused")
                            : (language === "zh" ? "启动" : "Started");

                      return (
                        <article key={index} className={`event ${eventType}`}>
                          <span className="event-marker"></span>
                          <div>
                            <div className="event-time">
                              {logTime.format("MMM DD HH:mm")}
                            </div>
                            <strong>{typeLabel}</strong>
                            {log.duration !== null && log.duration > 0 && (
                              <span style={{ marginLeft: "var(--space-2)", color: "var(--meta)", fontSize: "var(--text-xs)" }}>
                                ({formatDuration(log.duration)})
                              </span>
                            )}
                            {log.reason && (log.reason.code || log.reason.detail) && (
                              <div style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                                {log.reason.detail || log.reason.code}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {hasMoreLogs && (
                      <button
                        className="btn btn-primary"
                        onClick={loadMoreLogs}
                        disabled={isLoadingLogs}
                        style={{ marginTop: "var(--space-4)" }}
                      >
                        {isLoadingLogs
                          ? (language === "zh" ? "加载中..." : "Loading...")
                          : (language === "zh" ? "加载更多" : "Load more")
                        }
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-soft)",
                    background: "color-mix(in oklab, var(--surface), var(--bg) 22%)",
                    padding: "var(--space-8)",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: "var(--text-sm)",
                  }}>
                    {language === "zh" ? "暂无事件记录" : "No incidents recorded"}
                  </div>
                )}
              </aside>
            </div>
          </section>
        </main>

        <Footer />
      </div>
      {isProtectionEnabled ? (
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      ) : null}
    </Suspense>
  );
}

interface ResponseTimeChartProps {
  responseTimes: { datetime: string; value: number }[];
}

function ResponseTimeChart({ responseTimes }: ResponseTimeChartProps) {
  const { language } = useLanguage();

  const chartData = useMemo(() => {
    const sliced = responseTimes.slice(-200);
    return sliced.map((rt) => ({
      time: dayjs(rt.datetime).format("MM-DD HH:mm"),
      value: rt.value,
    }));
  }, [responseTimes]);

  const { avg, max, min } = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, max: 0, min: 0 };
    const values = chartData.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round(sum / values.length),
      max: Math.max(...values),
      min: Math.min(...values),
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div style={{
        borderRadius: "var(--radius-md)",
        border: "1px dashed var(--border-soft)",
        background: "color-mix(in oklab, var(--surface), var(--bg) 22%)",
        padding: "var(--space-8)",
        textAlign: "center",
        color: "var(--muted)",
        fontSize: "var(--text-sm)",
      }}>
        {language === "zh" ? "暂无响应时间数据" : "No response time data"}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
        <span>{language === "zh" ? "平均" : "Avg"}: <strong style={{ color: "var(--fg)" }}>{avg}ms</strong></span>
        <span>{language === "zh" ? "最大" : "Max"}: <strong style={{ color: "var(--fg)" }}>{max}ms</strong></span>
        <span>{language === "zh" ? "最小" : "Min"}: <strong style={{ color: "var(--fg)" }}>{min}ms</strong></span>
        <span style={{ color: "var(--meta)" }}>{chartData.length} {language === "zh" ? "个数据点" : "points"}</span>
      </div>
      <div style={{ height: "320px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--warn)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--warn)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "var(--meta)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--meta)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}ms`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-xs)",
                boxShadow: "var(--elev-raised)",
              }}
              labelStyle={{ color: "var(--meta)", marginBottom: "4px" }}
              formatter={(value: number) => [`${value}ms`, language === "zh" ? "响应时间" : "Response"]}
              labelFormatter={(label) => `${language === "zh" ? "时间" : "Time"}: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--warn)"
              strokeWidth={1.5}
              fill="url(#responseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--warn)", strokeWidth: 2, stroke: "var(--surface)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
