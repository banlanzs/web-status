/**
 * 客户端数据缓存和管理
 * 解决频繁请求和数据持久化问题
 */

import { type NormalizedMonitor } from "@/types/uptimerobot";

const CACHE_KEY = "monitors_cache";
const CACHE_TIMESTAMP_KEY = "monitors_cache_timestamp";
const CACHE_TTL = 60 * 1000; // 60 秒缓存

interface CachedData {
  monitors: NormalizedMonitor[];
  timestamp: number;
}

/**
 * 从本地存储获取缓存数据
 */
export function getCachedMonitors(): NormalizedMonitor[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_TTL) {
      // 缓存过期，清除
      clearMonitorsCache();
      return null;
    }

    return JSON.parse(cached) as NormalizedMonitor[];
  } catch (error) {
    console.error("[Cache] 读取缓存失败:", error);
    return null;
  }
}

/**
 * 保存数据到本地存储
 */
export function setCachedMonitors(monitors: NormalizedMonitor[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(monitors));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch (error) {
    console.error("[Cache] 保存缓存失败:", error);
  }
}

/**
 * 清除缓存
 */
export function clearMonitorsCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error("[Cache] 清除缓存失败:", error);
  }
}

/**
 * 根据 ID 获取单个监控器
 */
export function getCachedMonitor(id: number): NormalizedMonitor | null {
  const monitors = getCachedMonitors();
  if (!monitors) return null;

  return monitors.find((m) => m.id === id) || null;
}

/**
 * 合并新的响应时间数据到现有监控器
 */
export function mergeResponseTimes(
  oldMonitor: NormalizedMonitor,
  newResponseTime: { at: string; value: number }
): NormalizedMonitor {
  const existingTimes = oldMonitor.responseTimes || [];
  
  // 检查是否已存在相同时间点的数据
  const isDuplicate = existingTimes.some(
    (rt) => rt.at === newResponseTime.at
  );

  if (isDuplicate) {
    return oldMonitor;
  }

  // 添加新数据点并按时间排序
  const updatedTimes = [...existingTimes, newResponseTime].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  // 只保留最近 1000 个数据点
  const trimmedTimes = updatedTimes.slice(-1000);

  // 重新计算平均响应时间
  const avgResponseTime =
    trimmedTimes.reduce((sum, rt) => sum + rt.value, 0) / trimmedTimes.length;

  return {
    ...oldMonitor,
    responseTimes: trimmedTimes,
    averageResponseTime: Math.round(avgResponseTime),
    lastResponseTime: newResponseTime.value,
    lastCheckedAt: newResponseTime.at,
  };
}

/**
 * 更新缓存中的单个监控器
 */
export function updateCachedMonitor(
  updatedMonitor: NormalizedMonitor
): void {
  const monitors = getCachedMonitors();
  if (!monitors) return;

  const index = monitors.findIndex((m) => m.id === updatedMonitor.id);
  if (index === -1) return;

  monitors[index] = updatedMonitor;
  setCachedMonitors(monitors);
}
