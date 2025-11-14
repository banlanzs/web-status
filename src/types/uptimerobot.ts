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
  average_response_time?: number;
  custom_uptime_ratio?: string;
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

export interface NormalizedMonitor {
  id: number;
  name: string;
  url: string;
  type: string;
  interval: number;
  status: MonitorStatus;
  statusCode: number;
  uptimeRatio: {
    last7Days: number | null;
    last30Days: number | null;
    last90Days: number | null;
  };
  downDuration: {
    last7Days: number | null;
    last30Days: number | null;
    last90Days: number | null;
  };
  logs: {
    type: number;
    datetime: string;
    duration: number | null;
    reason?: {
      code?: string;
      detail?: string;
    };
  }[];
  logs24h: {
    type: number;
    datetime: string;
    duration: number | null;
    reason?: {
      code?: string;
      detail?: string;
    };
  }[];
  incidents: {
    total: number;
    totalDowntimeSeconds: number;
    downCount: number;
    pauseCount: number;
  };
  incidents24h: {
    total: number;
    totalDowntimeSeconds: number;
    downCount: number;
    pauseCount: number;
  };
  lastCheckedAt: string | null;
}

