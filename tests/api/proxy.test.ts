import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { signToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const token = (role: string, sub = "user-1") => signToken({ sub, role });

function run(path: string, opts: { cookie?: string; bearer?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(opts.headers);
  if (opts.cookie) headers.set("cookie", `${SESSION_COOKIE}=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  return proxy(new NextRequest(`http://localhost${path}`, { headers }));
}

// NextResponse.next({ request: { headers } }) exposes the forwarded headers like this:
const forwarded = (res: Response, name: string) => res.headers.get(`x-middleware-request-${name}`);

describe("proxy: API routes", () => {
  it("lets the login and logout routes through without a session", () => {
    for (const p of ["/api/auth/council-login", "/api/auth/student-login", "/api/auth/logout"]) {
      expect(run(p).status).toBe(200);
    }
  });

  it("rejects missing, invalid and role-less sessions with 401", () => {
    expect(run("/api/dashboard").status).toBe(401);
    expect(run("/api/dashboard", { cookie: "junk" }).status).toBe(401);
    expect(run("/api/dashboard", { cookie: signToken({ sub: "x" }) }).status).toBe(401);
  });

  it("enforces roles", () => {
    expect(run("/api/dashboard", { cookie: token("student") }).status).toBe(403);
    expect(run("/api/student/attendance", { cookie: token("council") }).status).toBe(403);
    expect(run("/api/dashboard", { cookie: token("admin") }).status).toBe(200);
    expect(run("/api/student/attendance", { cookie: token("student") }).status).toBe(200);
    expect(run("/api/auth/me", { cookie: token("student") }).status).toBe(200);
  });

  it("accepts a Bearer token too", () => {
    expect(run("/api/dashboard", { bearer: token("council") }).status).toBe(200);
  });

  it("sets identity headers from the token and never trusts the client's", () => {
    const res = run("/api/dashboard", { cookie: token("council", "real-user"), headers: { "x-user-id": "victim", "x-user-role": "admin" } });
    expect(forwarded(res, "x-user-id")).toBe("real-user");
    expect(forwarded(res, "x-user-role")).toBe("council");

    const pub = run("/api/auth/council-login", { headers: { "x-user-id": "victim", "x-user-role": "admin" } });
    expect(forwarded(pub, "x-user-id")).toBeNull();
    expect(forwarded(pub, "x-user-role")).toBeNull();
  });
});

describe("proxy: pages", () => {
  const location = (res: Response) => res.headers.get("location") && new URL(res.headers.get("location")!).pathname;

  it("sends logged-out visitors to the right login page", () => {
    expect(location(run("/dashboard/events"))).toBe("/");
    expect(location(run("/student-dashboard/reports"))).toBe("/student-login");
  });

  it("keeps each role on its own dashboard", () => {
    expect(location(run("/dashboard", { cookie: token("student") }))).toBe("/");
    expect(location(run("/student-dashboard", { cookie: token("council") }))).toBe("/student-login");
    expect(run("/dashboard", { cookie: token("council") }).headers.get("location")).toBeNull();
  });

  it("skips the login page when already logged in", () => {
    expect(location(run("/", { cookie: token("admin") }))).toBe("/dashboard");
    expect(location(run("/student-login", { cookie: token("student") }))).toBe("/student-dashboard");
  });
});
