// Formatting helpers shared by pages. Dates are stored as "YYYY-MM-DD" and
// times as "HH:mm" (school time), so they're formatted without time-zone math.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-13" → "October 13, 2026" */
export function formatDate(date?: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!m) return date ?? "";
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** "07:30" → "7:30 AM" */
export function formatTime(time?: string | null) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!m) return time ?? "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "October 13, 2026 · 7:30 AM – 5:00 PM" (or across days when the end date differs) */
export function formatEventWhen(e: { date?: string; endDate?: string; startTime?: string; endTime?: string }) {
  const start = [formatDate(e.date), formatTime(e.startTime)].filter(Boolean).join(" · ");
  if (e.endDate && e.endDate !== e.date) {
    return `${start} – ${[formatDate(e.endDate), formatTime(e.endTime)].filter(Boolean).join(" · ")}`;
  }
  return e.endTime ? `${start} – ${formatTime(e.endTime)}` : start;
}

/** ISO timestamp → "Oct 13, 2026, 7:31 AM" in the viewer's time zone. */
export function formatDateTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** ISO timestamp → "7:31 AM" in the viewer's time zone. */
export function formatClock(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export const YEAR_LABELS: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", "5": "5th" };

export function yearLabel(year?: string | null) {
  return year ? YEAR_LABELS[year] ?? year : "";
}
