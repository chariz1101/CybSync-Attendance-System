import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export function middleware(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.next();

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = verifyToken<{ sub?: string; role?: string }>(token);
    const headers = new Headers(req.headers);
    if (payload.sub) headers.set("x-user-id", payload.sub);
    if (payload.role) headers.set("x-user-role", payload.role);
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
  runtime: "nodejs",
};