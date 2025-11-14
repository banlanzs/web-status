import { NextResponse } from "next/server";
import { fetchMonitors } from "@/lib/uptimerobot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API 端点：获取监控数据
 * GET /api/monitors
 */
export async function GET() {
  try {
    const monitors = await fetchMonitors(false); // 不强制刷新，使用服务器端缓存

    return NextResponse.json({
      success: true,
      monitors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Monitors API] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "数据加载失败",
        monitors: [],
      },
      { status: 500 }
    );
  }
}
