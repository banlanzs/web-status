import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

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

// 生成自定义时间范围的函数（用于7/30/90天统计）
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

// 生成每日状态范围（90天）
function generateDailyUptimeRanges() {
  const today = dayjs(new Date().setHours(0, 0, 0, 0));
  const ranges: string[] = [];

  // 生成90天的每日范围
  for (let i = 89; i >= 0; i--) {
    const date = today.subtract(i, "day");
    const start = date.unix();
    const end = date.add(1, "day").unix() - 1; // 当天结束时间
    ranges.push(`${start}_${end}`);
  }

  return ranges.join("-");
}

const CUSTOM_UPTIME_RANGES = generateCustomUptimeRanges();
const DAILY_UPTIME_RANGES = generateDailyUptimeRanges();
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
      incidents: { total: 0, totalDowntimeSeconds: 0, totalPausedSeconds: 0, downCount: 0, pauseCount: 0 },
    };
  }

  const cutoff = dayjs().subtract(90, "day");
  const now = dayjs();
  let total = 0;
  let totalDowntimeSeconds = 0;
  let totalPausedSeconds = 0;
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
    .sort((a, b) => {
      const timeDiff = a.parsedDate.valueOf() - b.parsedDate.valueOf();
      if (timeDiff !== 0) return timeDiff;

      // 时间相同时的排序规则 (升序/历史顺序)
      // Up (2) 应该在 Paused (99) 之前 -> 先恢复，再暂停
      if (a.type === 2 && b.type === 99) return -1;
      if (a.type === 99 && b.type === 2) return 1;

      // Paused (99) 应该在 Started (98) 之前 -> 先暂停，再启动
      if (a.type === 99 && b.type === 98) return -1;
      if (a.type === 98 && b.type === 99) return 1;

      return 0;
    });

  // 处理日志，计算持续宕机的时长
  for (let i = 0; i < normalized.length; i++) {
    const log = normalized[i];

    // type: 1 表示宕机故障, 99 表示监控暂停
    if (log.type === 1 || log.type === 99) {
      total += 1;

      // 分别统计宕机和暂停次数
      if (log.type === 1) {
        downCount += 1;
      } else if (log.type === 99) {
        pauseCount += 1;
      }

      // 计算故障时长
      let duration = log.duration || 0;

      // 如果没有 duration 或 duration 为 0，说明可能还在持续中
      if (!duration || duration === 0) {
        // 查找下一个恢复日志 (type: 2) 或启动日志 (type: 98)
        const nextLog = normalized.slice(i + 1).find(l => l.type === 2 || l.type === 98);

        if (nextLog) {
          // 找到了恢复日志，计算时长
          duration = nextLog.parsedDate.diff(log.parsedDate, 'second');
        } else {
          // 没有找到恢复日志，说明还在持续中，计算到现在的时长
          duration = now.diff(log.parsedDate, 'second');
        }
      }

      // 只有在 log.type 为 1 (宕机) 时才累加到 totalDowntimeSeconds
      if (log.type === 1) {
        totalDowntimeSeconds += duration;
      } else if (log.type === 99) {
        totalPausedSeconds += duration;
      }

      // 更新日志的 duration
      normalized[i] = {
        ...log,
        duration,
      };
    }
  }

  // 移除 parsedDate 字段，只返回需要的数据
  const cleanedNormalized = normalized.map((log) => ({
    type: log.type,
    datetime: log.datetime,
    duration: log.duration,
    reason: log.reason,
  }));

  return { normalized: cleanedNormalized, incidents: { total, totalDowntimeSeconds, totalPausedSeconds, downCount, pauseCount } };
}

function normalizeMonitor(monitor: UptimeRobotMonitor): NormalizedMonitor {

  // v2 API 使用 snake_case 字段名



  // UptimeRobot API 不提供 "最后检查时间" 字段

  // 使用当前时间表示数据获取时间

  const lastCheckedAt = dayjs().toISOString();



  const { normalized: logs, incidents } = normalizeLogs(monitor.logs);



  // --- 手动计算不同时间段的可用率 ---
  const createDate = monitor.create_datetime ? dayjs.unix(monitor.create_datetime) : dayjs();
  const now = dayjs();

  const calculateUptime = (days: number): number | null => {
    const periodStart = now.subtract(days, 'day');
    // 确保计算的开始时间不早于监控创建时间
    const effectiveStart = createDate.isAfter(periodStart) ? createDate : periodStart;
    const periodEnd = now;
    const totalSeconds = periodEnd.diff(effectiveStart, 'second');

    if (totalSeconds <= 0) {
      return 100; // 如果总时长为0或负数，则认为100%可用
    }

    let downDuration = 0;
    let pausedDuration = 0;

    // 检查所有日志，计算在此时间段内的宕机和暂停时长
    logs.forEach(log => {
      const logStart = dayjs(log.datetime);
      const logEnd = logStart.add(log.duration || 0, 'second');

      // 检查日志时间范围是否与统计时间段有重叠
      if (logStart.isBefore(periodEnd) && logEnd.isAfter(effectiveStart)) {
        // 计算重叠部分的时长
        const overlapStart = logStart.isBefore(effectiveStart) ? effectiveStart : logStart;
        const overlapEnd = logEnd.isAfter(periodEnd) ? periodEnd : logEnd;
        const duration = Math.max(0, overlapEnd.diff(overlapStart, 'second'));

        if (log.type === 1) {
          downDuration += duration;
        } else if (log.type === 99) {
          pausedDuration += duration;
        }
      }
    });

    // 严格模式：暂停时间不计入可用时间 (分子减去暂停时间)，分母保持为总时间
    // 这会导致可用率在暂停期间显著下降
    const validUpSeconds = Math.max(0, totalSeconds - downDuration - pausedDuration);
    const uptimePercentage = (validUpSeconds / totalSeconds) * 100;

    return Math.max(0, Math.min(100, uptimePercentage));
  };

  const uptimeRatio = {
    last7Days: calculateUptime(7),
    last30Days: calculateUptime(30),
    last90Days: calculateUptime(90),
  };



  // 处理宕机时长数据 - 从 incidents 中获取，而不是从 API
  const downDuration = {
    last7Days: null, // 暂时设为 null，可以后续根据需要从日志中计算
    last30Days: null, // 暂时设为 null，可以后续根据需要从日志中计算
    // 使用从日志计算出的总宕机时长
    last90Days: incidents.totalDowntimeSeconds > 0 ? incidents.totalDowntimeSeconds : null,
  };

  // 处理每日状态数据（基于日志计算真实的每日状态）
  const dailyStatus: import("@/types/uptimerobot").DailyStatus[] = [];
  const today = dayjs(new Date().setHours(0, 0, 0, 0));

  // 创建日期索引映射
  const timeMap = new Map<string, number>();

  // 生成90天的每日数据初始化
  for (let i = 89; i >= 0; i--) {
    const date = today.subtract(i, "day");
    const dateUnix = date.unix();
    const dateString = date.format("YYYYMMDD");

    // 保存日期索引映射
    timeMap.set(dateString, dailyStatus.length);

    // 检查这一天是否在监控创建之后
    const isAfterCreate = createDate.isSameOrAfter(date, 'day');

    dailyStatus.push({
      date: dateUnix,
      uptime: isAfterCreate ? 100 : -1, // 默认100%，-1表示无数据
      down: { times: 0, duration: 0 },
      pause: { times: 0, duration: 0 },
    });
  }

  // 按时间排序日志
  const sortedLogs = [...logs].sort((a, b) =>
    dayjs(a.datetime).valueOf() - dayjs(b.datetime).valueOf()
  );

  // 成对处理日志：down/pause -> up
  let i = 0;
  while (i < sortedLogs.length) {
    const log = sortedLogs[i];

    // 只处理宕机或暂停事件
    if (log.type === 1 || log.type === 99) {
      const startTime = dayjs(log.datetime);
      let endTime: dayjs.Dayjs | null = null;

      // 查找对应的恢复日志
      for (let j = i + 1; j < sortedLogs.length; j++) {
        if (sortedLogs[j].type === 2 || sortedLogs[j].type === 98) {
          endTime = dayjs(sortedLogs[j].datetime);
          i = j; // 跳到恢复日志
          break;
        }
      }

      // 如果没有找到恢复日志，检查当前状态
      if (!endTime) {
        if (monitor.status === 8 || monitor.status === 9 || monitor.status === 0) {
          // 还在宕机或暂停中
          endTime = now;
        } else {
          // 可能数据不完整，跳过
          i++;
          continue;
        }
      }

      // 记录故障开始那天的次数
      const startDateString = startTime.format("YYYYMMDD");
      const startDateIndex = timeMap.get(startDateString);
      if (startDateIndex !== undefined && dailyStatus[startDateIndex]) {
        if (log.type === 1) {
          dailyStatus[startDateIndex].down.times += 1;
        } else {
          dailyStatus[startDateIndex].pause.times += 1;
        }
      }

      // 将时长分配到每一天
      let currentDay = startTime.startOf('day');

      while (currentDay.isSameOrBefore(endTime, 'day')) {
        const dateString = currentDay.format("YYYYMMDD");
        const dateIndex = timeMap.get(dateString);

        if (dateIndex !== undefined && dailyStatus[dateIndex]) {
          // 计算这一天的时长
          const dayStart = currentDay.isSame(startTime, 'day')
            ? startTime
            : currentDay;

          const dayEnd = currentDay.isSame(endTime, 'day')
            ? endTime
            : currentDay.endOf('day').add(1, 'second');

          const dayDuration = Math.max(0, dayEnd.diff(dayStart, 'second'));

          if (log.type === 1) {
            dailyStatus[dateIndex].down.duration += dayDuration;
          } else {
            dailyStatus[dateIndex].pause.duration += dayDuration;
          }
        }

        currentDay = currentDay.add(1, 'day');
      }
    }

    i++;
  }

  // 根据故障时长计算实际可用率

  dailyStatus.forEach((day, index) => {

    if (day.uptime >= 0) { // 只处理有效数据的天

      const date = dayjs.unix(day.date);

      const isToday = date.isSame(today, 'day');

      const dayStart = date.startOf('day');

      const dayEnd = date.endOf('day');



      // 计算实际应该用来计算可用率的时间段

      let totalSeconds: number;

      if (isToday) {

        // 今天：只计算已经过去的时间

        const elapsedSeconds = now.diff(dayStart, 'second');

        totalSeconds = Math.max(0, Math.min(elapsedSeconds, 24 * 60 * 60));

      } else {

        // 过去的日子：完整的24小时

        totalSeconds = 24 * 60 * 60;

      }



      // 检查今天是否处于暂停状态

      // 如果监控当前是暂停状态（status === 0）且今天没有恢复记录，今天应该显示为暂停状态

      if (isToday && monitor.status === 0) {

        // 检查今天是否有恢复记录（type 98）

        const hasResumeToday = logs.some(log =>

          (log.type === 98) && // 恢复类型

          dayjs(log.datetime).isSameOrAfter(today.startOf('day'), 'day') // 在今天或之后

        );



        if (!hasResumeToday) {

          // 如果监控当前是暂停状态且今天没有恢复记录，则今天应该显示为暂停状态

          // 这意味着暂停事件从今天开始前就开始了，或者昨天的暂停没有恢复

          // 确保今天有暂停记录，使getStatusType返回paused状态

          if (day.pause.duration === 0) {

            // 添加从今天00:00开始到现在的暂停时长

            const todayStart = today.startOf('day');

            const elapsedSeconds = now.diff(todayStart, 'second');

            day.pause.duration = Math.max(0, Math.min(elapsedSeconds, 24 * 60 * 60)); // 限制在24小时内

          }

        }

      }



      // 重新计算可用率

      if (day.down.duration > 0) {

        const actualDownDuration = Math.min(day.down.duration, totalSeconds);

        const upSeconds = totalSeconds - actualDownDuration;

        day.uptime = totalSeconds > 0 ? (upSeconds / totalSeconds) * 100 : 0;



        if (actualDownDuration >= totalSeconds) {

          day.uptime = 0;

        }

      } else {

        // 如果没有宕机时间，但有暂停时间，则根据暂停时间调整可用率

        if (day.pause.duration > 0) {

          const actualPauseDuration = Math.min(day.pause.duration, totalSeconds);

          const effectiveTotalSeconds = totalSeconds - actualPauseDuration; // 实际有效的监控时间

          if (effectiveTotalSeconds <= 0) {

            // 如果整个时间段都在暂停，则显示无数据

            day.uptime = 100; // 如果整个时间段都在暂停，则显示为暂停状态（保留暂停信息）

          } else {

            // 如果有暂停，但不是全天暂停，则根据有效监控时间计算

            day.uptime = effectiveTotalSeconds > 0 ? (effectiveTotalSeconds / totalSeconds) * 100 : 0;

          }

        } else {

          day.uptime = 100;

        }

      }

    }

  });

  return {
    id: monitor.id,
    name: monitor.friendly_name,
    url: monitor.url,
    type: MONITOR_TYPE_LABEL[monitor.type] ?? `Type ${monitor.type}`,
    interval: monitor.interval,
    createDatetime: monitor.create_datetime, // 添加创建日期
    status: STATUS_MAP[monitor.status] ?? "unknown",
    statusCode: monitor.status,
    uptimeRatio,
    downDuration,
    dailyStatus,
    logs,
    logs24h: [],
    incidents,
    incidents24h: { total: 0, totalDowntimeSeconds: 0, totalPausedSeconds: 0, downCount: 0, pauseCount: 0 },
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

    log_types: "1-2-98-99", // 1=宕机, 2=恢复, 98=启动, 99=暂停

    logs_start_date: String(logsStartDate),
    logs_end_date: String(logsEndDate),
    response_times: "1",
    response_times_limit: String(RESPONSE_TIMES_LIMIT), // 使用常量，获取尽可能多的响应时间数据
    custom_uptime_ranges: DAILY_UPTIME_RANGES, // 90天每日数据
    custom_uptime_ratios: "7-30-90", // 7/30/90天总体统计
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
