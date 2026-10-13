import { describe, expect, it } from "vitest";
import { addMinutes, attendanceStatus, lateNote, localDateTime } from "@/lib/late";

// Times written as Manila time (UTC+8); the test machine's own zone doesn't matter.
const at = (manila: string) => new Date(`2026-10-13T${manila}:00+08:00`);
const event = { startTime: "07:00", pmStartTime: "13:00", graceMinutes: 15 };

describe("attendanceStatus", () => {
  it.each([
    ["AM", "Sign In", "06:50", "on-time"],
    ["AM", "Sign In", "07:15", "on-time"],
    ["AM", "Sign In", "07:16", "late"],
    ["AM", "Sign Out", "16:00", "on-time"],
    ["PM", "Sign In", "13:10", "on-time"],
    ["PM", "Sign In", "13:30", "late"],
  ] as const)("%s %s at %s → %s", (session, action, time, expected) => {
    expect(attendanceStatus(event, session, action, at(time))).toBe(expected);
  });

  it("is on time when the session has no start time", () => {
    expect(attendanceStatus({}, "AM", "Sign In", at("23:00"))).toBe("on-time");
    expect(attendanceStatus({ startTime: "07:00" }, "PM", "Sign In", at("16:00"))).toBe("on-time");
  });

  it("uses a 15-minute grace period by default, and honors 0", () => {
    expect(attendanceStatus({ startTime: "07:00" }, "AM", "Sign In", at("07:14"))).toBe("on-time");
    expect(attendanceStatus({ startTime: "07:00", graceMinutes: 0 }, "AM", "Sign In", at("07:01"))).toBe("late");
  });
});

describe("helpers", () => {
  it("converts UTC to school time", () => {
    expect(localDateTime(new Date("2026-10-12T23:30:00Z"))).toEqual({ date: "2026-10-13", time: "07:30" });
  });

  it("adds minutes without passing midnight", () => {
    expect(addMinutes("07:50", 15)).toBe("08:05");
    expect(addMinutes("23:50", 30)).toBe("23:59");
  });

  it("describes when sign-ins become late", () => {
    expect(lateNote(event)).toBe("Sign-ins after 7:15 AM (AM) · 1:15 PM (PM) are marked late");
    expect(lateNote({})).toBe("");
  });
});
