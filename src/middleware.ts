import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";
import { SESSION_COOKIE } from "./lib/session";

// API routes anyone can call without being logged in.
const PUBLIC_API_ROUTES = ["/api/auth/council-login", "/api/auth/student-login", "/api/auth/logout"];

// API routes any logged-in user can call, whatever their role.
const ANY_ROLE_API_ROUTES = ["/api/auth/me"];

// Roles allowed on each group of routes. Student routes act on the logged-in
// student's own data; everything else is for council members and admins.
const STUDENT_ROLES = ["student"];
const COUNCIL_ROLES = ["council", "admin"];

// Login page and dashboard for each kind of user.
const COUNCIL_LOGIN = "/";
const COUNCIL_HOME = "/dashboard";
const STUDENT_LOGIN = "/student-login";
const STUDENT_HOME = "/student-dashboard";

// Identity headers the API routes trust. They must only ever come from a
// verified token, never from the client.
const IDENTITY_HEADERS = ["x-user-id", "x-user-role"];

type Session = { sub: string; role: string };

function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function withoutIdentityHeaders(req: NextRequest) {
  const headers = new Headers(req.headers);
  for (const name of IDENTITY_HEADERS) headers.delete(name);
  return headers;
}

/** Reads the session from the Authorization header or the session cookie. Returns null if missing or invalid. */
function getSession(req: NextRequest): Session | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = verifyToken<{ sub?: string; role?: string }>(token);
    return payload.sub && payload.role ? { sub: payload.sub, role: payload.role } : null;
  } catch {
    return null;
  }
}

function handleApi(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = withoutIdentityHeaders(req);
  if (PUBLIC_API_ROUTES.includes(pathname)) return NextResponse.next({ request: { headers } });

  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = ANY_ROLE_API_ROUTES.includes(pathname)
    ? [...STUDENT_ROLES, ...COUNCIL_ROLES]
    : isUnder(pathname, "/api/student")
      ? STUDENT_ROLES
      : COUNCIL_ROLES;
  if (!allowed.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  headers.set("x-user-id", session.sub);
  headers.set("x-user-role", session.role);
  return NextResponse.next({ request: { headers } });
}

function handlePage(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = getSession(req);
  const isCouncil = !!session && COUNCIL_ROLES.includes(session.role);
  const isStudent = !!session && STUDENT_ROLES.includes(session.role);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, req.url));

  // Dashboards need the right kind of login.
  if (isUnder(pathname, COUNCIL_HOME) && !isCouncil) return redirect(COUNCIL_LOGIN);
  if (isUnder(pathname, STUDENT_HOME) && !isStudent) return redirect(STUDENT_LOGIN);

  // Already logged in: skip the login page.
  if (pathname === COUNCIL_LOGIN && isCouncil) return redirect(COUNCIL_HOME);
  if (pathname === STUDENT_LOGIN && isStudent) return redirect(STUDENT_HOME);

  return NextResponse.next();
}

export function middleware(req: NextRequest) {
  return isUnder(req.nextUrl.pathname, "/api") ? handleApi(req) : handlePage(req);
}

export const config = {
  matcher: ["/api/:path*", "/", "/student-login", "/dashboard/:path*", "/student-dashboard/:path*"],
  runtime: "nodejs",
};
