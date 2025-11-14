import dayjs from "dayjs";

import {
  type NormalizedMonitor,
  type UptimeRobotApiResponse,
  type UptimeRobotLog,
  type UptimeRobotMonitor,
} from "@/types/uptimerobot";
import { uptimeRobotLimiter } from "./rate-limiter";
import { checkMonitor, type CustomMonitorConfig } from "./custom-monitor";

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
  // 处理响应时间数据，移除时间限制，保留所有 API 返回的数据
  const responseTimes =
    monitor.response_times
      ?.map((item) => {
        // 解析日期，支持数字（秒或毫秒）以及字符串
        let parsedDate: dayjs.Dayjs;
        const datetime = item.datetime;

        if (typeof datetime === "number" || /^\d+$/.test(String(datetime))) {
          const ts = Number(datetime);
          // 如果是秒级时间戳（小于1e12），使用 dayjs.unix
          parsedDate = ts < 1e12 ? dayjs.unix(ts) : dayjs(ts);
        } else {
          parsedDate = dayjs(datetime);
        }

        // 只检查日期是否有效，保留所有有效的响应时间数据
        if (!parsedDate.isValid()) return null;

        return {
          at: parsedDate.toISOString(),
          value: item.value,
        };
      })
      .filter((item): item is { at: string; value: number } => item !== null)
      .sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf()) ?? [];

  // 降级方案：如果没有 response_times 数据，使用 average_response_time 作为最新响应时间
  const lastResponseTime = responseTimes.at(-1)?.value ?? 
    (typeof monitor.average_response_time === "number" && Number.isFinite(monitor.average_response_time)
      ? monitor.average_response_time
      : null);

  // 确保 lastCheckedAt 为 ISO 字符串或 null
  let lastCheckedAt: string | null = null;
  if (responseTimes.at(-1)?.at) {
    lastCheckedAt = responseTimes.at(-1)!.at;
  } else if (monitor.response_times?.at(-1)?.datetime) {
    const raw = monitor.response_times.at(-1)!.datetime;
    const parsed = typeof raw === "number" || /^\d+$/.test(String(raw))
      ? (Number(raw) < 1e12 ? dayjs.unix(Number(raw)) : dayjs(Number(raw)))
      : dayjs(raw);
    lastCheckedAt = parsed.isValid() ? parsed.toISOString() : null;
  } else {
    // 降级：使用当前时间作为 lastCheckedAt
    lastCheckedAt = dayjs().toISOString();
  }

  // 计算平均响应时间（优先使用 API 返回的 average_response_time）
  let averageResponseTime: number | null = null;
  if (typeof monitor.average_response_time === "number" && Number.isFinite(monitor.average_response_time)) {
    averageResponseTime = monitor.average_response_time;
  } else if (responseTimes.length > 0) {
    // 从响应时间数据计算平均值
    const sum = responseTimes.reduce((acc, item) => acc + item.value, 0);
    averageResponseTime = sum / responseTimes.length;
  }

  // 如果没有响应时间数据，记录警告但不生成占位数据
  if (responseTimes.length === 0 && !averageResponseTime) {
    console.warn(
      `[Warning] 监控器 ${monitor.id} (${monitor.friendly_name}) 无任何响应时间数据`
    );
  }

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
    averageResponseTime,
    lastResponseTime,
    uptimeRatio,
    downDuration,
    responseTimes,
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

  // 服务器端调试日志：打印原始 API 响应的监控摘要
  try {
    const monitors = data.monitors ?? [];
    const totalResponseTimes = monitors.reduce((acc, m) => acc + (m.response_times?.length ?? 0), 0);
    
    console.log("\n========== [server debug] uptimerobot API response ==========");
    console.log(`Total monitors: ${monitors.length}`);
    console.log(`Total response_times entries: ${totalResponseTimes}`);
    console.log("\nPer-monitor summary:");
    monitors.forEach((m, idx) => {
      const rtCount = m.response_times?.length ?? 0;
      const avgRT = m.average_response_time ?? 'N/A';
      console.log(`  [${idx}] ${m.id} (${m.friendly_name}):`);
      console.log(`       response_times=${rtCount}, average_response_time=${avgRT}ms, logs=${m.logs?.length ?? 0}`);
      
      // 如果有响应时间数据，显示时间范围
      if (m.response_times && m.response_times.length > 0) {
        const firstRT = m.response_times[0];
        const lastRT = m.response_times[m.response_times.length - 1];
        console.log(`       time_range: ${firstRT.datetime} ~ ${lastRT.datetime}`);
      }
    });
    
    // 打印第一个监控的原始 response_times（最多 10 条）用于样例检查
    if (monitors.length > 0 && monitors[0].response_times && monitors[0].response_times.length > 0) {
      console.log(`\nSample response_times of monitor[0] (last 10 entries):`);
      const sample = monitors[0].response_times.slice(-10);
      sample.forEach((rt: any) => {
        console.log(`  datetime=${rt.datetime}, value=${rt.value}ms`);
      });
    } else if (monitors.length > 0) {
      console.log(`\n⚠️  monitor[0] has NO response_times data returned from API`);
      if (monitors[0].average_response_time) {
        console.log(`   但有 average_response_time: ${monitors[0].average_response_time}ms (将使用降级方案)`);
      }
    }
    console.log("============================================================\n");
  } catch (e) {
    // 无侵入式失败处理
    // eslint-disable-next-line no-console
    console.error("[server debug] failed to log raw monitors", e);
  }

  // 处理返回的监控数据
  const monitors = data.monitors ?? [];

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

  // 检查是否启用自定义监控增强
  const useCustomMonitor = process.env.NEXT_PUBLIC_USE_CUSTOM_MONITOR === "true";
  
  if (useCustomMonitor) {
    console.info("[Custom Monitor] 启用自定义监控增强功能");
    try {
      const enhancedData = await enhanceWithCustomMonitor(normalizedData);
      cachedMonitors = enhancedData;
      return enhancedData;
    } catch (error) {
      console.error("[Custom Monitor] 增强失败，使用原始数据:", error);
      // 失败时返回原始数据（已包含降级逻辑）
    }
  }

  return normalizedData;
}

/**
 * 使用自定义监控增强响应时间数据
 * 当 UptimeRobot API 没有返回响应时间数据时，直接检测目标 URL
 */
async function enhanceWithCustomMonitor(
  monitors: NormalizedMonitor[]
): Promise<NormalizedMonitor[]> {
  const monitorsNeedingEnhancement: CustomMonitorConfig[] = [];

  // 找出需要增强的监控器
  // 策略：如果 UptimeRobot API 完全没有返回响应时间数据（包括 average_response_time）
  monitors.forEach((monitor) => {
    // 检查是否有真实的 UptimeRobot 数据
    const hasRealApiData = monitor.averageResponseTime !== null && monitor.responseTimes.length > 0;
    
    const needsEnhancement = !hasRealApiData;

    if (needsEnhancement && monitor.url) {
      monitorsNeedingEnhancement.push({
        id: monitor.id,
        url: monitor.url,
        timeout: 30000,
      });
    }
  });

  if (monitorsNeedingEnhancement.length === 0) {
    console.info("[Custom Monitor] 所有监控器都有足够的响应时间数据，无需增强");
    return monitors;
  }

  console.info(
    `[Custom Monitor] 需要增强 ${monitorsNeedingEnhancement.length} 个监控器的响应时间数据`
  );

  // 批量检测响应时间
  const checkPromises = monitorsNeedingEnhancement.map(async (config) => {
    try {
      const result = await checkMonitor(config);
      return { id: config.id, result };
    } catch (error) {
      console.error(`[Custom Monitor] 检测失败 (ID: ${config.id}):`, error);
      return null;
    }
  });

  const results = await Promise.allSettled(checkPromises);

  // 将检测结果合并到监控数据中
  const enhancedMonitors = monitors.map((monitor) => {
    const needsEnhancement = monitorsNeedingEnhancement.find(
      (m) => m.id === monitor.id
    );

    if (!needsEnhancement) {
      return monitor;
    }

    // 查找对应的检测结果
    const resultIndex = monitorsNeedingEnhancement.findIndex(
      (m) => m.id === monitor.id
    );
    const settled = results[resultIndex];

    if (settled.status === "fulfilled" && settled.value) {
      const { result } = settled.value;

      // 不管成功还是失败，只要有 responseTime 就使用
      if (result.responseTime) {
        const statusSymbol = result.success ? "✓" : "✗";
        console.info(
          `[Custom Monitor] ${statusSymbol} ID ${monitor.id}: ${result.responseTime}ms ${result.error ? `(${result.error})` : ""}`
        );

        // 使用检测到的响应时间
        const newLastResponseTime = result.responseTime;
        
        // 添加最新的检测数据点
        let newResponseTimes = [...monitor.responseTimes];
        newResponseTimes.push({
          at: result.timestamp,
          value: newLastResponseTime,
        });

        // 重新计算平均响应时间
        const newAverageResponseTime =
          newResponseTimes.reduce((sum, item) => sum + item.value, 0) /
          newResponseTimes.length;

        return {
          ...monitor,
          lastResponseTime: newLastResponseTime,
          averageResponseTime: Math.round(newAverageResponseTime),
          responseTimes: newResponseTimes,
          lastCheckedAt: result.timestamp,
        };
      } else {
        console.warn(
          `[Custom Monitor] ✗ ID ${monitor.id}: 完全失败，无响应时间数据`
        );
      }
    }

    // 如果检测完全失败且已有占位数据，保持不变
    return monitor;
  });

  return enhancedMonitors;
}
