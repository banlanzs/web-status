import { NextResponse } from "next/server";
import { uptimeRobotLimiter } from "@/lib/rate-limiter";

export async function GET() {
  try {
    const rateLimitInfo = uptimeRobotLimiter.checkLimit();
    
    return NextResponse.json({
      remaining: rateLimitInfo.remainingRequests,
      total: 10,
      isLimited: rateLimitInfo.isLimited,
      resetIn: rateLimitInfo.resetIn
    });
  } catch (error) {
    console.error("Failed to get quota info", error);
    return NextResponse.json(
      { error: "Failed to get quota info" },
      { status: 500 }
    );
  }
}