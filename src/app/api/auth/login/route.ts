import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SITE_PASSWORD = process.env.SITE_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-please-change";
const COOKIE_NAME = "site_auth_token";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!SITE_PASSWORD) {
            // If password is not set in env, login is technically not needed or always allowed, 
            // but if we are here, the user is trying to log in.
            // Let's say if no password set, we just deny or allow? 
            // Plan said: "If SITE_PASSWORD is not set, the protection feature effectively defaults to disabled"
            // But typically we should error here if someone tries to login when not configured.
            return NextResponse.json(
                { error: "Protection not configured" },
                { status: 500 }
            );
        }

        if (password !== SITE_PASSWORD) {
            return NextResponse.json(
                { error: "Incorrect password" },
                { status: 401 }
            );
        }

        // Generate JWT
        const secret = new TextEncoder().encode(JWT_SECRET);
        const alg = "HS256";

        const jwt = await new SignJWT({ "urn:example:claim": true })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime("30d") // Long session
            .sign(secret);

        const response = NextResponse.json({ success: true });

        response.cookies.set({
            name: COOKIE_NAME,
            value: jwt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
            sameSite: "strict",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
