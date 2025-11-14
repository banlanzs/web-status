/**
 * 自定义监控模块 - 当 UptimeRobot API 无响应时间数据时使用
 * 参考 UptimeFlare 实现，直接检测目标网站的响应时间
 */

import dayjs from "dayjs";

export interface CustomMonitorConfig {
  id: number;
  url: string;
  method?: "GET" | "POST" | "HEAD";
  timeout?: number;
  expectedCodes?: number[];
  headers?: Record<string, string>;
}

export interface MonitorCheckResult {
  success: boolean;
  responseTime: number; // 毫秒
  statusCode?: number;
  error?: string;
  timestamp: string; // ISO 8601
}

/**
 * 检查单个监控目标的响应时间
 */
export async function checkMonitor(
  config: CustomMonitorConfig
): Promise<MonitorCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const timeout = config.timeout || 30000; // 默认 30 秒超时
  const expectedCodes = config.expectedCodes || [200, 201, 202, 203, 204];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(config.url, {
      method: config.method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        ...config.headers,
      },
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // 只要能获得响应就算成功（包括 4xx, 5xx）
    const isSuccess = true;

    return {
      success: isSuccess,
      responseTime,
      statusCode: response.status,
      timestamp,
    };
  } catch (error: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.error(`[Custom Monitor] 检测 ${config.url} 失败:`, error.message);

    // 超时错误
    if (error.name === "AbortError") {
      return {
        success: false,
        responseTime: timeout,
        error: `Timeout after ${timeout}ms`,
        timestamp,
      };
    }

    // 网络错误 - 返回失败但带响应时间
    // 即使失败，响应时间数据仍然有参考价值
    return {
      success: false,
      responseTime,
      error: error.message || "Network error",
      timestamp,
    };
  }
}

/**
 * 批量检查多个监控目标
 */
export async function checkMultipleMonitors(
  configs: CustomMonitorConfig[]
): Promise<Map<number, MonitorCheckResult>> {
  const results = new Map<number, MonitorCheckResult>();

  // 并发检查所有监控目标
  const promises = configs.map(async (config) => {
    const result = await checkMonitor(config);
    return { id: config.id, result };
  });

  const settledResults = await Promise.allSettled(promises);

  settledResults.forEach((settled) => {
    if (settled.status === "fulfilled") {
      const { id, result } = settled.value;
      results.set(id, result);
    }
  });

  return results;
}

/**
 * 生成模拟的历史响应时间数据
 * 用于在没有历史数据时提供图表展示
 */
export function generatePlaceholderData(
  averageResponseTime: number,
  hours: number = 24
): Array<{ at: string; value: number }> {
  const data: Array<{ at: string; value: number }> = [];
  const now = dayjs();
  const pointsCount = hours * 2; // 每小时 2 个数据点（30分钟间隔）

  for (let i = pointsCount; i >= 0; i--) {
    // 添加一些随机波动（±20%）使数据看起来更真实
    const variance = averageResponseTime * 0.2;
    const randomOffset = (Math.random() - 0.5) * 2 * variance;
    const value = Math.max(0, Math.round(averageResponseTime + randomOffset));

    data.push({
      at: now.subtract(i * 30, "minute").toISOString(),
      value,
    });
  }

  return data;
}

/**
 * 从 URL 提取域名或 IP（用于显示）
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * 格式化响应时间（毫秒）
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
