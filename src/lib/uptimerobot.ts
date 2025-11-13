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
  const cleanedNormalized = normalized.map(({ type, datetime, duration }) => ({
    type,
    datetime,
    duration,
  }));

  return { normalized: cleanedNormalized, incidents: { total, totalDowntimeSeconds, downCount, pauseCount } };
}

function normalizeMonitor(monitor: UptimeRobotMonitor): NormalizedMonitor {
  // v2 API 使用 snake_case 字段名
  // 处理响应时间数据，修复日期解析问题
  const now = dayjs();
  const cutoff90Days = now.subtract(90, "day");
  
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

        // 如果日期无效或早于90天前，返回null
        if (!parsedDate.isValid() || parsedDate.isBefore(cutoff90Days)) return null;

        return {
          at: parsedDate.toISOString(),
          value: item.value,
        };
      })
      .filter((item): item is { at: string; value: number } => item !== null)
      .sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf()) ?? [];

  const lastResponseTime = responseTimes.at(-1)?.value ?? null;

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
  }

  // 计算平均响应时间（如果API没有返回）
  let averageResponseTime: number | null = null;
  if (typeof monitor.average_response_time === "number" && Number.isFinite(monitor.average_response_time)) {
    averageResponseTime = monitor.average_response_time;
  } else if (responseTimes.length > 0) {
    // 从响应时间数据计算平均值
    const sum = responseTimes.reduce((acc, item) => acc + item.value, 0);
    averageResponseTime = sum / responseTimes.length;
  }

  const { normalized: logs, incidents } = normalizeLogs(monitor.logs);

  // 处理 uptime ratio 数据
  const uptimeRatio = {
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
  // 计算日志查询的时间范围（90天前到现在）
  const now = dayjs();
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
    response_times_limit: String(RESPONSE_TIMES_LIMIT),
    custom_uptime_ranges: CUSTOM_UPTIME_RANGES,
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
    throw new Error(
      data.error?.message ?? "UptimeRobot API 返回错误，请检查 API Key。",
    );
  }

  // 服务器端调试日志：打印原始 API 响应的监控摘要
  try {
    // 只打印必要字段，避免控制台被大量数据淹没
    console.groupCollapsed("[server debug] uptimerobot raw monitors summary");
    console.log(
      (data.monitors ?? []).map((m) => ({
        id: m.id,
        friendly_name: m.friendly_name,
        response_times_len: m.response_times?.length ?? 0,
        has_logs: (m.logs?.length ?? 0) > 0,
      })),
    );
    // 打印第一个监控的原始 response_times（最多 20 条）用于样例检查
    if (data.monitors && data.monitors.length > 0) {
      console.log("sample response_times of monitor[0]:", (data.monitors[0].response_times ?? []).slice(-20));
    }
    console.groupEnd();
  } catch (e) {
    // 无侵入式失败处理
    // eslint-disable-next-line no-console
    console.error("[server debug] failed to log raw monitors", e);
  }

  return (data.monitors ?? []).map(normalizeMonitor);
}
