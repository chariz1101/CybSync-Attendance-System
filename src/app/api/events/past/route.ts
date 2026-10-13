import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { Student } from "@/models/Student";
import { toEventJson } from "@/lib/events";
import { getEventStats } from "@/lib/eventStats";
import { eventFilterFor, requireStaff } from "@/lib/staff";

// GET /api/events/past: ended events (an organization's own; all for admins), newest first, with stats
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  const [events, totalStudents] = await Promise.all([
    Event.find({ ...eventFilterFor(staff), status: "past" }).sort({ date: -1, startTime: -1 }).limit(100),
    Student.countDocuments({ status: "active" }),
  ]);

  const result = await Promise.all(
    events.map(async (e) => ({ ...toEventJson(e), ...(await getEventStats(e._id, totalStudents)) }))
  );
  return NextResponse.json({ events: result });
}
