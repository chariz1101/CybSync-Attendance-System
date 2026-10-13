// Decides whether a scan is on time or late.

import { formatTime } from "@/lib/format";

export const DEFAULT_GRACE_MINUTES = 15;

/** The school's time zone. Event times are entered in this zone; servers (e.g. Vercel) run on UTC. */
export function schoolTimeZone() {
  return process.env.SCHOOL_TIMEZONE || "Asia/Manila";
}

/** A moment as "YYYY-MM-DD" and "HH:mm" in the given time zone. */
export function localDateTime(at: Date, timeZone = schoolTimeZone()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "07:00" + 15 → "07:15" */
export function addMinutes(hhmm: string, minutes: number) {
  const total = Math.min(toMinutes(hhmm) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type EventTimes = { startTime?: string | null; pmStartTime?: string | null; graceMinutes?: number | null };

/** The latest on-time sign-in for a session ("HH:mm"), or null if the event has no start time for it. */
export function lateAfter(event: EventTimes, session: "AM" | "PM") {
  const start = session === "PM" ? event.pmStartTime : event.startTime;
  if (!start) return null;
  return addMinutes(start, event.graceMinutes ?? DEFAULT_GRACE_MINUTES);
}

/**
 * A Sign In is late if it happens after the session's start time plus the grace
 * period (in school time). Sign Outs, and sessions without a start time, are on time.
 */
export function attendanceStatus(event: EventTimes, session: "AM" | "PM", action: string, at: Date): "on-time" | "late" {
  if (action !== "Sign In") return "on-time";
  const deadline = lateAfter(event, session);
  if (!deadline) return "on-time";
  return toMinutes(localDateTime(at).time) > toMinutes(deadline) ? "late" : "on-time";
}

/** "Sign-ins after 7:15 AM (AM) · 1:15 PM (PM) are marked late", or "" if the event has no start time. */
export function lateNote(event: EventTimes) {
  const am = lateAfter(event, "AM");
  const pm = lateAfter(event, "PM");
  if (!am && !pm) return "";
  const parts = [am && `${formatTime(am)}${pm ? " (AM)" : ""}`, pm && `${formatTime(pm)} (PM)`].filter(Boolean);
  return `Sign-ins after ${parts.join(" · ")} are marked late`;
}
