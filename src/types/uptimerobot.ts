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
  all_time_uptime_ratio?: number;
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
  averageResponseTime: number | null;
  lastResponseTime: number | null;
  uptimeRatio: {
    last7Days: number | null;
    last30Days: number | null;
    last90Days: number | null;
    allTime: number | null;
  };
  responseTimes: {
    at: string;
    value: number;
  }[];
  logs: {
    type: number;
    datetime: string;
    duration: number | null;
  }[];
  incidents: {
    total: number;
    totalDowntimeSeconds: number;
  };
  lastCheckedAt: string | null;
}

