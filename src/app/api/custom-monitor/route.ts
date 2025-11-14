import { NextRequest, NextResponse } from "next/server";
import { checkMonitor, type CustomMonitorConfig } from "@/lib/custom-monitor";

export const runtime = "edge"; // 使用 Edge Runtime 以获得更快的响应

/**
 * API 端点：检查单个或多个监控目标的响应时间
 * POST /api/custom-monitor
 * 
 * Body: {
 *   monitors: Array<{
 *     id: number,
 *     url: string,
 *     method?: string,
 *     timeout?: number
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monitors } = body;

    if (!monitors || !Array.isArray(monitors)) {
      return NextResponse.json(
        { error: "Invalid request body: monitors array is required" },
        { status: 400 }
      );
    }

    // 批量检查所有监控目标
    const results: Record<number, any> = {};

    // 并发执行所有检查
    const checkPromises = monitors.map(async (monitor: CustomMonitorConfig) => {
      if (!monitor.id || !monitor.url) {
        return null;
      }

      const result = await checkMonitor(monitor);
      return { id: monitor.id, result };
    });

    const settledResults = await Promise.allSettled(checkPromises);

    settledResults.forEach((settled) => {
      if (settled.status === "fulfilled" && settled.value) {
        const { id, result } = settled.value;
        results[id] = result;
      }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("[Custom Monitor API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "custom-monitor",
    timestamp: new Date().toISOString(),
  });
}
