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
import { ScrollToTop } from "@/components/scroll-to-top";
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

interface MonitorDetailProps {
  monitor: NormalizedMonitor;
}

const SHOW_LINKS =
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "false" &&
  process.env.NEXT_PUBLIC_SHOW_MONITOR_LINKS !== "0";

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

  const overallStatus = monitor.status === "down" ? "down" :
                         monitor.status === "paused" ? "paused" : "up";

  return (
    <Suspense fallback={
      <div className="min-h-screen" style={{ background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            border: "4px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{ marginTop: 16, color: "var(--muted)" }}>{language === "zh" ? "加载中..." : "Loading..."}</p>
        </div>
      </div>
    }>
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <TopNav onRequestLogin={() => setIsLoginModalOpen(true)} overallStatus={overallStatus as any} />

        <main>
          {/* Detail Header */}
          <section className="container">
            <div className="detail-header">
              <div>
                <Link className="body-sm body-muted" href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}>
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>{language === "zh" ? "概览" : "Overview"}</span>
                </Link>
                <div className="detail-title-row" style={{ marginTop: 12 }}>
                  <h1 className="detail-title">{monitor.name}</h1>
                  <StatusBadge status={monitor.status} label={statusLabel} />
                </div>
                <div className="detail-url" style={{ marginTop: 4 }}>
                  {monitorLink} · {monitor.interval / 60}s {language === "zh" ? "检查间隔" : "check interval"}
                </div>

                <div className="kpi-row">
                  <div className="kpi">
                    <div className="kpi__label">{language === "zh" ? "可用率 (90天)" : "Uptime (90d)"}</div>
                    <div className="kpi__value">
                      {monitor.uptimeRatioLast90Days !== null
                        ? `${formatNumber(monitor.uptimeRatioLast90Days)}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpi__label">{language === "zh" ? "平均响应" : "Avg response"}</div>
                    <div className="kpi__value">
                      {monitor.responseTimes.length > 0
                        ? `${monitor.responseTimes[monitor.responseTimes.length - 1].value} ms`
                        : "—"}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpi__label">{language === "zh" ? "事件 (90天)" : "Incidents (90d)"}</div>
                    <div className="kpi__value">{monitor.incidents.total}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi__label">{language === "zh" ? "刷新间隔" : "Check interval"}</div>
                    <div className="kpi__value" style={{ fontSize: 16 }}>{monitor.interval / 60}s</div>
                  </div>
                </div>
              </div>

              <div>
                {SHOW_LINKS && (!isProtectionEnabled || isLoggedIn) ? (
                  <a className="btn btn--secondary" href={monitorLink} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {language === "zh" ? "打开端点" : "Open endpoint"}
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          {/* Response Time Chart */}
          {monitor.responseTimes.length > 0 && (
            <section className="container" style={{ marginTop: 32 }}>
              <div className="chart-card">
                <div className="chart-card__head">
                  <h2 className="chart-card__title">{language === "zh" ? "响应时间" : "Response time"}</h2>
                </div>
                <ResponseTimeChart responseTimes={monitor.responseTimes} />
              </div>
            </section>
          )}

          {/* Event Log */}
          <section className="container" aria-labelledby="eventsTitle">
            <div className="section__head" style={{ marginTop: 32 }}>
              <h2 className="section__title" id="eventsTitle">
                {language === "zh" ? "近期事件" : "Recent incidents"}
              </h2>
              <span className="body-muted body-sm">
                {sortedLogs.length > 0
                  ? `${visibleLogs.length} / ${sortedLogs.length} ${language === "zh" ? "条" : "shown"}`
                  : ""}
              </span>
            </div>

            {sortedLogs.length > 0 ? (
              <>
                <div className="event-log">
                  {visibleLogs.map((log, index) => {
                    const logTime = dayjs(log.datetime);
                    const eventType = log.type === 1 ? "event--down" : log.type === 99 ? "event--paused" : "";
                    const typeLabel = log.type === 1
                      ? (language === "zh" ? "宕机" : "Down")
                      : log.type === 2
                        ? (language === "zh" ? "恢复" : "Recovered")
                        : log.type === 99
                          ? (language === "zh" ? "暂停" : "Paused")
                          : (language === "zh" ? "启动" : "Started");

                    return (
                      <article key={index} className={`event ${eventType}`}>
                        <div className="event__rail" />
                        <div>
                          <div className="event__head">
                            <h3 className="event__title">{typeLabel}</h3>
                            <span className="event__time">{logTime.format("YYYY-MM-DD HH:mm")}</span>
                          </div>
                          {log.duration !== null && log.duration > 0 && (
                            <div className="event__body">
                              {language === "zh" ? "持续时间" : "Duration"}: {formatDuration(log.duration)}
                            </div>
                          )}
                          {log.reason && (log.reason.code || log.reason.detail) && (
                            <div className="event__body">
                              {log.reason.detail || log.reason.code}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {hasMoreLogs && (
                  <div className="load-more">
                    <button
                      className="btn btn--secondary"
                      onClick={loadMoreLogs}
                      disabled={isLoadingLogs}
                    >
                      {isLoadingLogs
                        ? (language === "zh" ? "加载中..." : "Loading...")
                        : (language === "zh" ? "加载更多事件" : "Load older incidents")
                      }
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border)",
                background: "var(--surface)",
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "var(--text-sm)",
              }}>
                {language === "zh" ? "暂无事件记录" : "No incidents recorded"}
              </div>
            )}
          </section>
        </main>

        <Footer />
        <ScrollToTop />
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
        border: "1px dashed var(--border)",
        background: "var(--surface)",
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
      <div style={{ height: "240px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--meta)", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--meta)", fontFamily: "var(--font-mono)" }}
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
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#responseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "var(--surface)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
