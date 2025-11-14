import { NextResponse } from "next/server";
import { fetchMonitors } from "@/lib/uptimerobot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API 端点：获取监控数据
 * GET /api/monitors?force=timestamp (可选：强制刷新)
 */
export async function GET(request: Request) {
  try {
    // 检查是否有 force 参数来强制刷新
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.has('force');
    
    const monitors = await fetchMonitors(forceRefresh);

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
