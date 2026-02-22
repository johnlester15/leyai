import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
// 10 requests per day per IP
const LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const ipMap = new Map<string, { count: number; resetAt: number }>();

export function middleware(req: NextRequest) {
  // Only limit the generate API
  if (!req.nextUrl.pathname.startsWith("/api/generate")) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // New window
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (entry.count >= LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached (${LIMIT} generations/day). Come back tomorrow! 😊` },
      { status: 429 }
    );
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: "/api/generate",
};