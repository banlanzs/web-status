"use client";

import { cn } from "@/lib/utils";
import type { MonitorStatus } from "@/types/uptimerobot";

const STATUS_STYLES: Record<
  MonitorStatus,
  { bg: string; dot: string; text: string }
> = {
  up: {
    bg: "bg-success/10 text-success-foreground",
    dot: "bg-success",
    text: "text-success-foreground",
  },
  down: {
    bg: "bg-danger/10 text-danger-foreground",
    dot: "bg-danger",
    text: "text-danger-foreground",
  },
  paused: {
    bg: "bg-warning/10 text-warning-foreground",
    dot: "bg-warning",
    text: "text-warning-foreground",
  },
  unknown: {
    bg: "bg-slate-200 text-slate-600",
    dot: "bg-slate-400",
    text: "text-slate-600",
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
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
        styles.bg,
        className,
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          styles.dot,
          "shadow-[0_0_0_3px_rgba(255,255,255,0.4)]",
        )}
      />
      <span className={styles.text}>{label}</span>
    </span>
  );
}

