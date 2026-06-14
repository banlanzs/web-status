"use client";

import { cn } from "@/lib/utils";
import type { MonitorStatus } from "@/types/uptimerobot";

const STATUS_STYLES: Record<
  MonitorStatus,
  { className: string }
> = {
  up: {
    className: "up",
  },
  down: {
    className: "down",
  },
  paused: {
    className: "pause",
  },
  unknown: {
    className: "",
  },
};

interface StatusBadgeProps {
  status: MonitorStatus;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  return (
    <span className={cn("badge", styles.className, className)}>
      <span className="dot" />
      <span>{label}</span>
    </span>
  );
}
