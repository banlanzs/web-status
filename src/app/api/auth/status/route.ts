import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SITE_PASSWORD = process.env.SITE_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-please-change";
const COOKIE_NAME = "site_auth_token";

export async function GET(request: NextRequest) {
    const protectionEnabled = !!SITE_PASSWORD;

    if (!protectionEnabled) {
        return NextResponse.json({
            isLoggedIn: false, // Doesn't matter if protection is disabled
            protectionEnabled: false,
        });
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({
            isLoggedIn: false,
            protectionEnabled: true,
        });
    }

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        await jwtVerify(token, secret);

        return NextResponse.json({
            isLoggedIn: true,
            protectionEnabled: true,
        });
    } catch (error) {
        // Token valid failed
        return NextResponse.json({
            isLoggedIn: false,
            protectionEnabled: true,
        });
    }
}
