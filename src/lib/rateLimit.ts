import { NextResponse } from "next/server";
import { LoginAttempt } from "@/models/LoginAttempt";

// Login rate limits: failed attempts allowed per window, per account and per IP.
export const WINDOW_MINUTES = 15;
export const MAX_FAILURES_PER_ACCOUNT = 5;
export const MAX_FAILURES_PER_IP = 20;

/** The client's IP. On Vercel, x-forwarded-for is set by the platform, not the client. */
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function loginLimitKeys(req: Request, kind: "council" | "student", account: string) {
  return {
    account: { key: `${kind}:${account.trim().toLowerCase()}`, max: MAX_FAILURES_PER_ACCOUNT },
    ip: { key: `ip:${clientIp(req)}`, max: MAX_FAILURES_PER_IP },
  };
}

type Limit = { key: string; max: number };

/** Returns a 429 response if any key has used up its failed attempts, otherwise null. */
export async function checkLoginLimit(limits: Limit[]) {
  const now = new Date();
  const docs = await LoginAttempt.find({ key: { $in: limits.map((l) => l.key) }, expiresAt: { $gt: now } });
  const blocked = docs.filter((d) => d.count >= limits.find((l) => l.key === d.key)!.max);
  if (!blocked.length) return null;

  const until = Math.max(...blocked.map((d) => d.expiresAt.getTime()));
  const minutes = Math.max(1, Math.ceil((until - now.getTime()) / 60000));
  return NextResponse.json(
    { success: false, message: `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(Math.ceil((until - now.getTime()) / 1000)) } }
  );
}

/** Counts a failed attempt against each key. A key's window starts at its first failure. */
export async function recordLoginFailure(limits: Limit[]) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60000);
  await Promise.all(
    limits.map((l) =>
      LoginAttempt.updateOne(
        { key: l.key },
        [
          {
            $set: {
              // Start a new window if there's none yet or the old one has expired
              // (MongoDB's TTL cleanup can lag by up to a minute).
              count: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: ["$count", 1] }, 1] },
              expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", windowEnd] },
            },
          },
        ],
        { upsert: true, updatePipeline: true }
      )
    )
  );
}

/** Clears an account's failed attempts after a successful login. (The IP counter is kept.) */
export async function clearLoginFailures(limit: Limit) {
  await LoginAttempt.deleteOne({ key: limit.key });
}
