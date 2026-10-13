import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// Routes anyone can call without a token.
const PUBLIC_ROUTES = ["/api/auth/council-login", "/api/auth/student-login"];

// Roles allowed on each group of routes. Student routes act on the logged-in
// student's own data; everything else is for council members and admins.
const STUDENT_ROLES = ["student"];
const COUNCIL_ROLES = ["council", "admin"];

function allowedRoles(pathname: string) {
  return pathname === "/api/student" || pathname.startsWith("/api/student/") ? STUDENT_ROLES : COUNCIL_ROLES;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);
  let payload: { sub?: string; role?: string };
  try {
    payload = verifyToken<{ sub?: string; role?: string }>(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!payload.sub || !payload.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowedRoles(pathname).includes(payload.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id", payload.sub);
  headers.set("x-user-role", payload.role);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
  runtime: "nodejs",
};
