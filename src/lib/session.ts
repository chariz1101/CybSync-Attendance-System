import type { NextResponse } from "next/server";

// The login token lives in an httpOnly cookie so page scripts can't read it,
// and so the middleware can protect pages as well as API routes.
export const SESSION_COOKIE = "cybsync_session";

const REMEMBER_ME_DAYS = 30;

/** Token lifetime: 30 days with "Remember me", otherwise TOKEN_EXPIRY (default 1 day). */
export function sessionExpiry(rememberMe: boolean) {
  return rememberMe ? `${REMEMBER_ME_DAYS}d` : process.env.TOKEN_EXPIRY || "1d";
}

/** "Remember me" keeps the cookie after the browser closes; otherwise it's a browser-session cookie. */
export function setSessionCookie(res: NextResponse, token: string, rememberMe: boolean) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 } : {}),
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
