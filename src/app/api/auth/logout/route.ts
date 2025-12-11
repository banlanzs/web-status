import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "site_auth_token";

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ success: true });

    response.cookies.delete(COOKIE_NAME);

    return response;
}
