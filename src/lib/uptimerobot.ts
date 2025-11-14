import dayjs from "dayjs";

import {
  type NormalizedMonitor,
  type UptimeRobotApiResponse,
  type UptimeRobotLog,
  type UptimeRobotMonitor,
} from "@/types/uptimerobot";
import { uptimeRobotLimiter } from "./rate-limiter";

const API_BASE_URL = "https://api.uptimerobot.com/v2";
const API_ENDPOINT = `${API_BASE_URL}/getMonitors`;

// 数据缓存
let cachedMonitors: NormalizedMonitor[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 缓存有效期 60 秒

// 强制刷新标记
let forceRefresh = false;

// 生成自定义时间范围的函数
function generateCustomUptimeRanges() {
  // 生成三个时间段的数据，与 custom_uptime_ratios 参数匹配
  const today = dayjs(new Date().setHours(0, 0, 0, 0));
  const days = [7, 30, 90];
  
  return days.map((day) => {
    const start = today.subtract(day, "day").unix();
    const end = today.unix();
    return `${start}_${end}`;
  }).join("-");
}

const CUSTOM_UPTIME_RANGES = generateCustomUptimeRanges();
const RESPONSE_TIMES_LIMIT = 2000; // 增加到 2000 以获取更多历史数据

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

function normalizeLogs(logs: UptimeRobotLog[] | undefined) {
  if (!logs?.length) {
    return {
      normalized: [],
      incidents: { total: 0, totalDowntimeSeconds: 0, downCount: 0, pauseCount: 0 },
    };
  }

  const cutoff = dayjs().subtract(90, "day");
  let total = 0;
  let totalDowntimeSeconds = 0;
  let downCount = 0;  // 宕机次数
  let pauseCount = 0; // 暂停次数

  const normalized = logs
    .map((log) => {
      // 解析日期时间，支持 Unix 时间戳和字符串格式
      let parsedDate: dayjs.Dayjs;
      const datetime = log.datetime;
      
      if (typeof datetime === "number" || /^\d+$/.test(String(datetime))) {
        const timestamp = Number(datetime);
        // Unix 时间戳（秒）
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
        reason: log.reason, // 直接保留 reason 字段
      };
    })
    .filter((log) => log.parsedDate.isValid() && log.parsedDate.isAfter(cutoff))
    .sort((a, b) => a.parsedDate.valueOf() - b.parsedDate.valueOf());

  normalized.forEach((log) => {
    // 参考 site-status 项目的实现：
    // type: 1 表示宕机故障
    // type: 99 表示监控暂停
    // 这两种类型都被视为故障事件
    if (log.type === 1 || log.type === 99) {
      total += 1;
      if (log.duration) totalDowntimeSeconds += log.duration;
      
      // 分别统计宕机和暂停次数
      if (log.type === 1) {
        downCount += 1;
      } else if (log.type === 99) {
        pauseCount += 1;
      }
    }
  });

  // 移除 parsedDate 字段，只返回需要的数据
  const cleanedNormalized = normalized.map((log) => ({
    type: log.type,
    datetime: log.datetime,
    duration: log.duration,
    reason: log.reason, // 使用已经保留的 reason 字段
  }));

  return { normalized: cleanedNormalized, incidents: { total, totalDowntimeSeconds, downCount, pauseCount } };
}

function normalizeMonitor(monitor: UptimeRobotMonitor): NormalizedMonitor {
  // v2 API 使用 snake_case 字段名
  
  // UptimeRobot API 不提供 "最后检查时间" 字段
  // 使用当前时间表示数据获取时间
  const lastCheckedAt = dayjs().toISOString();

  const { normalized: logs, incidents } = normalizeLogs(monitor.logs);

  // 处理 uptime ratio 数据
  const uptimeRatio = {
    // 7天数据是第一个（索引为0）时间段
    last7Days: monitor.custom_uptime_ratio ? 
      (() => {
        const segments = monitor.custom_uptime_ratio?.split("-");
        if (!segments || segments.length === 0) return null;
        const value = parseFloat(segments[0] ?? "");
        return Number.isFinite(value) ? value : null;
      })() : null,
    // 30天数据是第二个（索引为1）时间段
    last30Days: monitor.custom_uptime_ratio ? 
      (() => {
        const segments = monitor.custom_uptime_ratio?.split("-");
        if (!segments || segments.length <= 1) return null;
        const value = parseFloat(segments[1] ?? "");
        return Number.isFinite(value) ? value : null;
      })() : null,
    // 90天数据是第三个（索引为2）时间段
    last90Days: monitor.custom_uptime_ratio ? 
      (() => {
        const segments = monitor.custom_uptime_ratio?.split("-");
        if (!segments || segments.length <= 2) return null;
        const value = parseFloat(segments[2] ?? "");
        return Number.isFinite(value) ? value : null;
      })() : null,
  };

  // 处理宕机时长数据 - 从 incidents 中获取，而不是从 API
  const downDuration = {
    last7Days: null, // 暂时设为 null，可以后续根据需要从日志中计算
    last30Days: null, // 暂时设为 null，可以后续根据需要从日志中计算
    // 使用从日志计算出的总宕机时长
    last90Days: incidents.totalDowntimeSeconds > 0 ? incidents.totalDowntimeSeconds : null,
  };

  return {
    id: monitor.id,
    name: monitor.friendly_name,
    url: monitor.url,
    type: MONITOR_TYPE_LABEL[monitor.type] ?? `Type ${monitor.type}`,
    interval: monitor.interval,
    status: STATUS_MAP[monitor.status] ?? "unknown",
    statusCode: monitor.status,
    uptimeRatio,
    downDuration,
    logs,
    logs24h: [],
    incidents,
    incidents24h: { total: 0, totalDowntimeSeconds: 0, downCount: 0, pauseCount: 0 },
    lastCheckedAt,
  };
}

export async function fetchMonitors(forceUpdate = false): Promise<NormalizedMonitor[]> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "未配置 UPTIMEROBOT_API_KEY 环境变量，请在 Vercel 或本地 .env 中设置。",
    );
  }

  // 检查是否需要强制刷新
  if (forceUpdate) {
    forceRefresh = true;
  }

  // 检查速率限制
  const rateLimitCheck = uptimeRobotLimiter.checkLimit();
  const now = dayjs();
  const cacheAge = Date.now() - cacheTimestamp;
  const isCacheValid = cachedMonitors && cacheAge < CACHE_TTL;

  // 如果超过速率限制且不是强制刷新，返回缓存数据并提示用户
  if (rateLimitCheck.isLimited && !forceRefresh) {
    const resetInSeconds = Math.ceil(rateLimitCheck.resetIn / 1000);
    console.warn(
      `[Rate Limit] API 请求被限制。速率限制: 10 req/min, 重置时间: ${resetInSeconds}秒后`
    );

    // 设置速率限制信息到 localStorage，供前端显示
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("rate_limit_info", JSON.stringify({
          isLimited: true,
          message: `API 速率限制已达上限 (10 req/min)。请在 ${resetInSeconds} 秒后重试。`,
          timestamp: Date.now()
        }));
      } catch (e) {
        // 忽略存储错误
      }
    }

    if (isCacheValid) {
      console.info(
        `[Rate Limit] 返回缓存数据 (缓存年龄: ${Math.round(cacheAge / 1000)}秒)`
      );
      // 即使是假刷新，也返回缓存数据
      return cachedMonitors!;
    } else {
      // 如果没有有效缓存，抛出错误
      throw new Error(
        `API 速率限制已达上限 (10 req/min)。请在 ${resetInSeconds} 秒后重试。`
      );
    }
  }

  // 如果缓存有效且不是强制刷新，直接返回缓存
  if (isCacheValid && !forceRefresh) {
    console.info(
      `[Cache Hit] 返回缓存数据 (缓存年龄: ${Math.round(cacheAge / 1000)}秒, 剩余请求: ${rateLimitCheck.remainingRequests}/10)`
    );
    return cachedMonitors!;
  }

  // 清除强制刷新标记
  forceRefresh = false;

  // 记录此次 API 请求
  uptimeRobotLimiter.recordRequest();
  console.info(
    `[API Request] 发起新请求 (剩余配额: ${rateLimitCheck.remainingRequests - 1}/10)`
  );

  // 计算日志查询的时间范围（90天前到现在）
  const logsStartDate = now.subtract(90, "day").unix();
  const logsEndDate = now.unix();
  
  const params = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    logs: "1",
    logs_limit: "300", // 增加日志限制以获取更多历史记录
    log_types: "1-2-99", // 1=宕机, 2=恢复, 99=暂停
    logs_start_date: String(logsStartDate),
    logs_end_date: String(logsEndDate),
    response_times: "1",
    response_times_limit: String(RESPONSE_TIMES_LIMIT), // 使用常量，获取尽可能多的响应时间数据
    custom_uptime_ranges: CUSTOM_UPTIME_RANGES,
    custom_uptime_ratios: "7-30-90",
  });

  // 执行主请求（带 response_times 时间范围，默认最近 7 天）
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

  let data = (await response.json()) as UptimeRobotApiResponse;

  if (data.stat !== "ok") {
    const errorMessage = data.error?.message ?? "UptimeRobot API 返回错误，请检查 API Key。";
    console.error(`[API Error] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // 处理返回的监控数据
  const monitors = data.monitors ?? [];
  console.log(`[API Response] 获取到 ${monitors.length} 个监控器`);

  // 更新缓存
  const normalizedData = monitors.map(normalizeMonitor);
  cachedMonitors = normalizedData;
  cacheTimestamp = Date.now();

  console.info(
    `[Cache Updated] 缓存已更新 (${normalizedData.length} 个监控器)`
  );

  // 清除速率限制信息
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem("rate_limit_info");
    } catch (e) {
      // 忽略存储错误
    }
  }

  cachedMonitors = normalizedData;
  cacheTimestamp = Date.now();
  
  return normalizedData;
}
