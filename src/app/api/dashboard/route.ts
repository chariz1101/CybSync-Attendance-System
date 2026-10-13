import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { EventRequest } from "@/models/EventRequest";
import { toEventJson } from "@/lib/events";
import { getEventStats } from "@/lib/eventStats";
import { eventFilterFor, requireStaff } from "@/lib/staff";

// GET /api/dashboard: stats for the current event (the running one, or else the
// most recent ended one) plus upcoming events. Organizations only see their own events.
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;

  const mine = eventFilterFor(staff);
  const [active, upcoming] = await Promise.all([
    Event.findOne({ ...mine, status: "active" }).sort({ startedAt: -1 }),
    Event.find({ ...mine, status: "upcoming" }).sort({ date: 1, startTime: 1 }).limit(5),
  ]);
  const event = active ?? (await Event.findOne({ ...mine, status: "past" }).sort({ date: -1, endedAt: -1 }));
  // Admins: requests waiting for approval. Organizations: their own pending requests.
  const pendingRequests = await EventRequest.countDocuments({ status: "pending", ...(staff.isAdmin ? {} : { "requestedBy.userId": staff.id }) });

  return NextResponse.json({
    event: event ? toEventJson(event) : null,
    ...(event ? await getEventStats(event._id) : { stats: null, courseDistribution: [], yearCourseDistribution: [] }),
    upcomingEvents: upcoming.map(toEventJson),
    pendingRequests,
  });
}
