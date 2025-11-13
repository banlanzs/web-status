import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  for (const [unitSeconds, label] of units) {
    if (remaining >= unitSeconds) {
      const value = Math.floor(remaining / unitSeconds);
      parts.push(`${value}${label.charAt(0)}`);
      remaining %= unitSeconds;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}

