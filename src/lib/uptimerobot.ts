import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

import {
  type LogEntry,
  type NormalizedMonitor,
  type UptimeRobotApiResponse,
  type UptimeRobotLog,
  type UptimeRobotMonitor,
} from "@/types/uptimerobot";
import { uptimeRobotLimiter } from "./rate-limiter";

const API_BASE_URL = "https://api.uptimerobot.com/v2";
const API_ENDPOINT = `${API_BASE_URL}/getMonitors`;

let cachedMonitors: NormalizedMonitor[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000;

let forceRefresh = false;

const RESPONSE_TIMES_LIMIT = 2000;

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

function normalizeLogs(logs: UptimeRobotLog[] | undefined): {
  normalized: LogEntry[];
  incidents: NormalizedMonitor["incidents"];
} {
  if (!logs?.length) {
    return {
      normalized: [],
      incidents: { total: 0, totalDowntimeSeconds: 0, totalPausedSeconds: 0, downCount: 0, pauseCount: 0 },
    };
  }

  const cutoff = dayjs().subtract(90, "day");
  const now = dayjs();
  let total = 0;
  let totalDowntimeSeconds = 0;
  let totalPausedSeconds = 0;
  let downCount = 0;
  let pauseCount = 0;

  const normalized = logs
    .map((log) => {
      let parsedDate: dayjs.Dayjs;
      const datetime = log.datetime;

      if (typeof datetime === "number" || /^\d+$/.test(String(datetime))) {
        const timestamp = Number(datetime);
        parsedDate = timestamp < 1e12 ? dayjs.unix(timestamp) : dayjs(timestamp);
      } else {
        parsedDate = dayjs(datetime);
      }

      return {
        type: log.type,
        datetime: parsedDate.isValid() ? parsedDate.toISOString() : log.datetime,
        parsedDate,
        duration:
          typeof log.duration === "number" && Number.isFinite(log.duration)
            ? log.duration
            : null,
        reason: log.reason,
      };
    })
    .filter((log) => log.parsedDate.isValid() && log.parsedDate.isAfter(cutoff))
    .sort((a, b) => {
      const timeDiff = a.parsedDate.valueOf() - b.parsedDate.valueOf();
      if (timeDiff !== 0) return timeDiff;
      if (a.type === 2 && b.type === 99) return -1;
      if (a.type === 99 && b.type === 2) return 1;
      if (a.type === 99 && b.type === 98) return -1;
      if (a.type === 98 && b.type === 99) return 1;
      return 0;
    });

  for (let i = 0; i < normalized.length; i++) {
    const log = normalized[i];
    if (log.type === 1 || log.type === 99) {
      total += 1;
      if (log.type === 1) downCount += 1;
      else pauseCount += 1;

      let duration = log.duration || 0;
      if (!duration || duration === 0) {
        const nextLog = normalized.slice(i + 1).find(l => l.type === 2 || l.type === 98);
        if (nextLog) {
          duration = nextLog.parsedDate.diff(log.parsedDate, 'second');
        } else {
          duration = now.diff(log.parsedDate, 'second');
        }
      }

      if (log.type === 1) totalDowntimeSeconds += duration;
      else totalPausedSeconds += duration;

      normalized[i] = { ...log, duration };
    }
  }

  const cleanedLogs: LogEntry[] = normalized.map((log) => ({
    type: log.type,
    datetime: log.datetime,
    duration: log.duration,
    reason: log.reason,
  }));

  return {
    normalized: cleanedLogs,
    incidents: { total, totalDowntimeSeconds, totalPausedSeconds, downCount, pauseCount },
  };
}

function normalizeResponseTimes(
  responseTimes: { datetime: string; value: number }[] | undefined,
): { datetime: string; value: number }[] {
  if (!responseTimes?.length) return [];
  const cutoff = dayjs().subtract(90, "day");

  return responseTimes
    .filter((rt) => {
      const datetime = rt.datetime;
      let d: dayjs.Dayjs;
      if (typeof datetime === "number" || /^\d+$/.test(String(datetime))) {
        const ts = Number(datetime);
        d = ts < 1e12 ? dayjs.unix(ts) : dayjs(ts);
      } else {
        d = dayjs(datetime);
      }
      return d.isValid() && d.isAfter(cutoff);
    })
    .map((rt) => {
      const datetime = rt.datetime;
      let d: dayjs.Dayjs;
      if (typeof datetime === "number" || /^\d+$/.test(String(datetime))) {
        const ts = Number(datetime);
        d = ts < 1e12 ? dayjs.unix(ts) : dayjs(ts);
      } else {
        d = dayjs(datetime);
      }
      return {
        datetime: d.toISOString(),
        value: rt.value,
      };
    });
}

function normalizeMonitor(monitor: UptimeRobotMonitor): NormalizedMonitor {
  const { normalized: logs, incidents } = normalizeLogs(monitor.logs);

  // 计算90天可用率
  const createDate = monitor.create_datetime ? dayjs.unix(monitor.create_datetime) : dayjs();
  const now = dayjs();
  const periodStart = now.subtract(90, 'day');
  const effectiveStart = createDate.isAfter(periodStart) ? createDate : periodStart;
  const totalSeconds = now.diff(effectiveStart, 'second');

  let downDuration = 0;
  let pausedDuration = 0;

  if (totalSeconds > 0) {
    logs.forEach(log => {
      const logStart = dayjs(log.datetime);
      const logEnd = logStart.add(log.duration || 0, 'second');
      if (logStart.isBefore(now) && logEnd.isAfter(effectiveStart)) {
        const overlapStart = logStart.isBefore(effectiveStart) ? effectiveStart : logStart;
        const overlapEnd = logEnd.isAfter(now) ? now : logEnd;
        const duration = Math.max(0, overlapEnd.diff(overlapStart, 'second'));
        if (log.type === 1) downDuration += duration;
        else if (log.type === 99) pausedDuration += duration;
      }
    });
  }

  const uptimeRatioLast90Days = totalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalSeconds - downDuration - pausedDuration) / totalSeconds) * 100))
    : null;

  const responseTimes = normalizeResponseTimes(monitor.response_times);

  return {
    id: monitor.id,
    name: monitor.friendly_name,
    url: monitor.url,
    type: MONITOR_TYPE_LABEL[monitor.type] ?? `Type ${monitor.type}`,
    interval: monitor.interval,
    createDatetime: monitor.create_datetime,
    status: STATUS_MAP[monitor.status] ?? "unknown",
    uptimeRatioLast90Days:
      uptimeRatioLast90Days !== null && Number.isFinite(uptimeRatioLast90Days)
        ? Math.round(uptimeRatioLast90Days * 100) / 100
        : null,
    downDurationLast90Days:
      incidents.totalDowntimeSeconds > 0 ? incidents.totalDowntimeSeconds : null,
    logs,
    incidents,
    lastCheckedAt: dayjs().toISOString(),
    responseTimes,
  };
}

export async function fetchMonitors(forceUpdate = false): Promise<NormalizedMonitor[]> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "未配置 UPTIMEROBOT_API_KEY 环境变量，请在 Vercel 或本地 .env 中设置。",
    );
  }

  if (forceUpdate) {
    forceRefresh = true;
  }

  const rateLimitCheck = uptimeRobotLimiter.checkLimit();
  const cacheAge = Date.now() - cacheTimestamp;
  const isCacheValid = cachedMonitors && cacheAge < CACHE_TTL;

  if (rateLimitCheck.isLimited && !forceRefresh) {
    const resetInSeconds = Math.ceil(rateLimitCheck.resetIn / 1000);
    console.warn(
      `[Rate Limit] API 请求被限制。速率限制: 10 req/min, 重置时间: ${resetInSeconds}秒后`
    );
    if (isCacheValid) {
      console.info(`[Rate Limit] 返回缓存数据 (缓存年龄: ${Math.round(cacheAge / 1000)}秒)`);
      return cachedMonitors!;
    }
    throw new Error(`API 速率限制已达上限 (10 req/min)。请在 ${resetInSeconds} 秒后重试。`);
  }

  if (isCacheValid && !forceRefresh) {
    console.info(`[Cache Hit] 返回缓存数据 (缓存年龄: ${Math.round(cacheAge / 1000)}秒)`);
    return cachedMonitors!;
  }

  forceRefresh = false;
  uptimeRobotLimiter.recordRequest();
  console.info(`[API Request] 发起新请求 (剩余配额: ${rateLimitCheck.remainingRequests - 1}/10)`);

  const now = dayjs();
  const logsStartDate = now.subtract(90, "day").unix();
  const logsEndDate = now.unix();

  const params = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    logs: "1",
    logs_limit: "300",
    log_types: "1-2-98-99",
    logs_start_date: String(logsStartDate),
    logs_end_date: String(logsEndDate),
    response_times: "1",
    response_times_limit: String(RESPONSE_TIMES_LIMIT),
    custom_uptime_ratios: "7-30-90",
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
    const msg = data.error?.message ?? "UptimeRobot API 返回错误，请检查 API Key。";
    console.error(`[API Error] ${msg}`);
    throw new Error(msg);
  }

  const monitors = data.monitors ?? [];
  console.log(`[API Response] 获取到 ${monitors.length} 个监控器`);

  const normalizedData = monitors.map(normalizeMonitor);
  cachedMonitors = normalizedData;
  cacheTimestamp = Date.now();
  console.info(`[Cache Updated] 缓存已更新 (${normalizedData.length} 个监控器)`);

  return normalizedData;
}
