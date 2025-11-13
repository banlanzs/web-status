/**
 * API 速率限制器
 * UptimeRobot FREE plan: 10 req/min
 */

interface RateLimiterConfig {
  maxRequests: number; // 最大请求数
  windowMs: number; // 时间窗口（毫秒）
}

class RateLimiter {
  private requests: number[] = []; // 存储请求时间戳
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  /**
   * 检查是否允许新请求
   * @returns true 如果允许请求，false 如果超过限制
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // 清除时间窗口外的旧请求记录
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    // 检查是否超过限制
    return this.requests.length < this.config.maxRequests;
  }

  /**
   * 记录新请求
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * 尝试执行请求，如果超过限制则返回缓存数据
   * @param cachedData 缓存的数据
   * @returns { allowed: boolean, remainingRequests: number }
   */
  checkLimit(): { allowed: boolean; remainingRequests: number; resetIn: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // 清除时间窗口外的旧请求记录
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    const allowed = this.requests.length < this.config.maxRequests;
    const remainingRequests = Math.max(0, this.config.maxRequests - this.requests.length);
    
    // 计算下次可用时间（最早的请求过期时间）
    const resetIn = this.requests.length > 0 
      ? Math.max(0, this.requests[0] + this.config.windowMs - now)
      : 0;

    return { allowed, remainingRequests, resetIn };
  }

  /**
   * 获取剩余请求数
   */
  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  /**
   * 重置限制器
   */
  reset(): void {
    this.requests = [];
  }
}

// 创建全局实例（UptimeRobot FREE plan: 10 req/min）
export const uptimeRobotLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 60 秒
});

export default RateLimiter;
