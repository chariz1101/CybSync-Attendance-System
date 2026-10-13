import { describe, expect, it } from "vitest";
import { formatDate, formatEventWhen, formatTime, yearLabel } from "@/lib/format";
import { detectFileType } from "@/lib/reports";

describe("format", () => {
  it("formats dates and times without time-zone shifts", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(yearLabel("3")).toBe("3rd");
  });

  it("formats event ranges", () => {
    expect(formatEventWhen({ date: "2026-10-13", startTime: "07:00", endTime: "17:00" })).toBe("October 13, 2026 · 7:00 AM – 5:00 PM");
    expect(formatEventWhen({ date: "2026-10-13", endDate: "2026-10-14" })).toBe("October 13, 2026 – October 14, 2026");
  });
});

describe("detectFileType", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  const ascii = (s: string) => new TextEncoder().encode(s);

  it("recognizes allowed files by content", () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d))).toBe("image/png");
    expect(detectFileType(ascii("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(detectFileType(ascii("%PDF-1.7"))).toBe("application/pdf");
  });

  it("rejects anything else, whatever its name", () => {
    expect(detectFileType(ascii("<html><script>"))).toBeNull();
    expect(detectFileType(ascii("GIF89a"))).toBeNull();
    expect(detectFileType(bytes())).toBeNull();
  });
});
