"use client";

import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { MonitorCard } from "@/components/monitor-card";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/providers/language-provider";
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

  return (
    <div className="min-h-screen bg-slate-100">
      <section className="relative overflow-hidden bg-hero-gradient pb-32 pt-16 text-white">
        <div className="absolute inset-0 opacity-20">
          <svg
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 400"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 200 Q200 100 400 200 T800 200 V400 H0 Z"
              fill="url(#waveGradient)"
              opacity="0.6"
            />
            <defs>
              <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#fff" stopOpacity="0.7" offset="0%" />
                <stop stopColor="#fff" stopOpacity="0" offset="100%" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-white/70">
                {t("app.name")}
              </p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">
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
                  className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30"
                  disabled={isPending}
                >
                  {isPending ? t("controls.refreshing") : t("controls.refresh")}
                </button>
              ) : null}
              <LanguageSwitcher />
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <StatusBadge status={overallStatus} label={summaryTagline} />
            <span className="rounded-full bg-white/10 px-3 py-1">
              {t("app.lastUpdated", { time: formattedUpdatedAt })}
            </span>
            {refreshInterval > 0 ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {t("app.nextRefresh", { seconds: secondsLeft })}
              </span>
            ) : null}
            <span className="rounded-full bg-white/10 px-3 py-1">
              {t("app.monitorsSummary", {
                total: summary.total,
                up: summary.up,
                down: summary.down,
              })}
            </span>
          </div>
        </div>
      </section>

      <main className="-mt-20 space-y-6 pb-24">
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
            monitors.map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

