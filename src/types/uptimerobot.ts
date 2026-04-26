// v2 API Response Structure
export interface UptimeRobotApiResponse {
  stat: "ok" | "fail";
  monitors?: UptimeRobotMonitor[];
  error?: {
    type: string;
    message: string;
  };
}

export interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  subtype?: string;
  status: number;
  interval: number;
  create_datetime?: number;
  average_response_time?: number;
  custom_uptime_ratio?: string;
  custom_uptime_ranges?: string;
  custom_down_durations?: string;
  response_times?: UptimeRobotResponseTime[];
  logs?: UptimeRobotLog[];
}

export interface UptimeRobotResponseTime {
  datetime: string;
  value: number;
}

export interface UptimeRobotLog {
  type: number;
  datetime: string;
  duration?: number;
  reason?: {
    code?: string;
    detail?: string;
  };
}

export type MonitorStatus = "up" | "down" | "paused" | "unknown";

export interface LogEntry {
  type: number;
  datetime: string;
  duration: number | null;
  reason?: {
    code?: string;
    detail?: string;
  };
}

export interface NormalizedMonitor {
  id: number;
  name: string;
  url: string;
  type: string;
  interval: number;
  createDatetime?: number;
  status: MonitorStatus;
  uptimeRatioLast90Days: number | null;
  downDurationLast90Days: number | null;
  logs: LogEntry[];
  incidents: {
    total: number;
    totalDowntimeSeconds: number;
    totalPausedSeconds: number;
    downCount: number;
    pauseCount: number;
  };
  lastCheckedAt: string | null;
  responseTimes: {
    datetime: string;
    value: number;
  }[];
}
