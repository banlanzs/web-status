import dayjs from "dayjs";

import {
  type NormalizedMonitor,
  type UptimeRobotApiResponse,
  type UptimeRobotLog,
  type UptimeRobotMonitor,
} from "@/types/uptimerobot";

const API_BASE_URL = "https://api.uptimerobot.com/v2";
const API_ENDPOINT = `${API_BASE_URL}/getMonitors`;

// 生成自定义时间范围的函数
function generateCustomUptimeRanges() {
  const dates = [];
  const days = [7, 30, 90];
  const today = dayjs(new Date().setHours(0, 0, 0, 0));
  
  // 为每个天数生成范围
  return days.map((day) => {
    const start = today.subtract(day, "day").unix();
    const end = today.unix();
    return `${start}_${end}`;
  }).join("-");
}

const CUSTOM_UPTIME_RANGES = generateCustomUptimeRanges();
const RESPONSE_TIMES_LIMIT = 50;

const STATUS_MAP: Record<number, NormalizedMonitor["status"]> = {
  0: "paused",
  1: "unknown",
  2: "up",
  8: "down",
  9: "down",
};

const MONITOR_TYPE_LABEL: Record<number, string> = {
  1: "HTTP",
  2: "Keyword",
  3: "Ping",
  4: "Port",
  5: "Heartbeat",
};


function parseUptime(raw: string | undefined, index: number) {
  if (!raw) return null;
  const segments = raw.split("-");
  if (segments.length <= index) return null;
  const value = parseFloat(segments[index] ?? "");
  return Number.isFinite(value) ? value : null;
}

function normalizeLogs(logs: UptimeRobotLog[] | undefined) {
  if (!logs?.length) {
    return {
      normalized: [],
      incidents: { total: 0, totalDowntimeSeconds: 0 },
    };
  }

  const cutoff = dayjs().subtract(90, "day");
  let total = 0;
  let totalDowntimeSeconds = 0;

  const normalized = logs
    .map((log) => ({
      type: log.type,
      datetime: log.datetime,
      duration:
        typeof log.duration === "number" && Number.isFinite(log.duration)
          ? log.duration
          : null,
    }))
    .filter((log) => dayjs(log.datetime).isAfter(cutoff))
    .sort(
      (a, b) =>
        dayjs(a.datetime).valueOf() - dayjs(b.datetime).valueOf(),
    );

  normalized.forEach((log) => {
    if (log.type === 1) {
      total += 1;
      if (log.duration) totalDowntimeSeconds += log.duration;
    }
  });

  return { normalized, incidents: { total, totalDowntimeSeconds } };
}

function normalizeMonitor(monitor: UptimeRobotMonitor): NormalizedMonitor {
  // v2 API 使用 snake_case 字段名
  const responseTimes =
    monitor.response_times?.map((item) => ({
      at: dayjs(item.datetime).toISOString(),
      value: item.value,
    })) ?? [];

  const lastResponseTime = responseTimes.at(-1)?.value ?? null;
  const lastCheckedAt =
    responseTimes.at(-1)?.at ?? monitor.response_times?.at(-1)?.datetime ?? null;

  const { normalized: logs, incidents } = normalizeLogs(monitor.logs);

  return {
    id: monitor.id,
    name: monitor.friendly_name,
    url: monitor.url,
    type: MONITOR_TYPE_LABEL[monitor.type] ?? `Type ${monitor.type}`,
    interval: monitor.interval,
    status: STATUS_MAP[monitor.status] ?? "unknown",
    statusCode: monitor.status,
    averageResponseTime:
      typeof monitor.average_response_time === "number"
        ? monitor.average_response_time
        : null,
    lastResponseTime,
    uptimeRatio: {
      last7Days: parseUptime(monitor.custom_uptime_ratio, 0),
      last30Days: parseUptime(monitor.custom_uptime_ratio, 1),
      last90Days: parseUptime(monitor.custom_uptime_ratio, 2),
    },
    responseTimes,
    logs,
    incidents,
    lastCheckedAt,
  };
}

export async function fetchMonitors(): Promise<NormalizedMonitor[]> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "未配置 UPTIMEROBOT_API_KEY 环境变量，请在 Vercel 或本地 .env 中设置。",
    );
  }

  // v2 API 使用 application/x-www-form-urlencoded 格式
  const params = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    logs: "1",
    log_types: "1-2",
    response_times: "1",
    response_times_limit: String(RESPONSE_TIMES_LIMIT),
    custom_uptime_ranges: CUSTOM_UPTIME_RANGES,
  });

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: params.toString(),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`UptimeRobot API 请求失败：${response.statusText}`);
  }

  const data = (await response.json()) as UptimeRobotApiResponse;

  if (data.stat !== "ok") {
    throw new Error(
      data.error?.message ?? "UptimeRobot API 返回错误，请检查 API Key。",
    );
  }

  return (data.monitors ?? []).map(normalizeMonitor);
}
