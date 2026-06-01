"use client";

import { cn } from "@/lib/utils";
import type { MonitorStatus } from "@/types/uptimerobot";

const STATUS_STYLES: Record<MonitorStatus, { className: string }> = {
  up: { className: "badge--up" },
  down: { className: "badge--down" },
  paused: { className: "badge--paused" },
  unknown: { className: "" },
};

interface StatusBadgeProps {
  status: MonitorStatus;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, className, size = "md" }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  return (
    <span className={cn("badge", styles.className, size === "sm" && "badge--small", className)}>
      <span className="badge__dot" />
      <span>{label}</span>
    </span>
  );
}

interface StatusPillProps {
  status: "up" | "degraded" | "down" | "paused";
  label: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const pillClass = status === "degraded" ? "status-pill--degraded" :
                    status === "down" ? "status-pill--down" :
                    status === "paused" ? "status-pill--paused" : "";
  return (
    <span className={cn("status-pill", pillClass, className)}>
      <span className="status-pill__dot" />
      <span>{label}</span>
    </span>
  );
}

interface OverallBadgeProps {
  status: "up" | "degraded" | "down" | "paused";
  label: string;
  className?: string;
}

export function OverallBadge({ status, label, className }: OverallBadgeProps) {
  return (
    <span className={cn("overall", className)}>
      <span>{label}</span>
    </span>
  );
}
