import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { Event } from "@/models/Event";

type Who = { id: string; role: "admin" | "council" | "student" };

/**
 * Builds a Request as the proxy would pass it to a route handler: identity
 * headers set from a verified session (or none for public routes).
 */
export function req(path: string, opts: { method?: string; json?: unknown; body?: BodyInit; as?: Who; headers?: Record<string, string> } = {}) {
  const headers = new Headers(opts.headers);
  if (opts.as) {
    headers.set("x-user-id", opts.as.id);
    headers.set("x-user-role", opts.as.role);
  }
  let body = opts.body;
  if (opts.json !== undefined) {
    body = JSON.stringify(opts.json);
    headers.set("content-type", "application/json");
  }
  return new Request(`http://localhost${path}`, { method: opts.method ?? (body !== undefined ? "POST" : "GET"), headers, body });
}

/** Route-handler context for dynamic segments, e.g. params({ eventId }) */
export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

export async function json<T = Record<string, any>>(res: Response) {
  return { status: res.status, body: (await res.json()) as T };
}

export async function makeUser(username: string, role: "admin" | "council", password = "password-123") {
  await connectDB();
  const user = await User.create({ username, name: `${username} name`, role, passwordHash: await hashPassword(password) });
  return { id: user.id as string, role } as Who & { role: "admin" | "council" };
}

let n = 0;
export async function makeStudent(fields: Partial<{ studentId: string; name: string; email: string; course: string; year: string; section: string; rfid: string; status: string }> = {}) {
  await connectDB();
  n++;
  const student = await Student.create({
    studentId: `2026M${String(n).padStart(4, "0")}`,
    name: `Student ${n}`,
    email: `student${n}@school.edu.ph`,
    course: "BSCS",
    year: "1",
    section: "A",
    ...fields,
  });
  return { student, as: { id: student.id as string, role: "student" as const } };
}

export async function makeEvent(fields: Record<string, unknown> = {}) {
  await connectDB();
  return Event.create({ name: "Test Event", date: "2026-10-13", startTime: "07:00", status: "active", ...fields });
}
