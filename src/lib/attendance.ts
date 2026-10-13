import { z } from "zod";

// Each event can have morning/afternoon sessions, with a sign-in and a sign-out scan.
export const SESSIONS = ["AM", "PM"] as const;
export const ACTIONS = ["Sign In", "Sign Out"] as const;

export const scanSchema = z.object({
  rfid: z.string().trim().min(1, "Scan a card or type a Student ID"),
  eventId: z.string().min(1, "Choose an event"),
  type: z.enum(SESSIONS).default("AM"),
  action: z.enum(ACTIONS).default("Sign In"),
});

type PopulatedStudent = { studentId?: string; name?: string; course?: string; year?: string; section?: string } | null;

export function toRecordJson(r: { id: string; student: unknown; type?: string; action?: string; checkInTime: Date; status: string }) {
  const s = r.student as PopulatedStudent;
  return {
    id: r.id,
    studentId: s?.studentId ?? "",
    name: s?.name ?? "(deleted student)",
    course: s?.course ?? "",
    year: s?.year ?? "",
    section: s?.section ?? "",
    type: r.type ?? "",
    action: r.action ?? "",
    timestamp: r.checkInTime.toISOString(),
    status: r.status as "on-time" | "late" | "excused",
  };
}
