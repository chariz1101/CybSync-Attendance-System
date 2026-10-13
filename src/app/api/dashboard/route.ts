import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { toEventJson } from "@/lib/events";
import { getEventStats } from "@/lib/eventStats";

// GET /api/dashboard: stats for the current event (the active one, or else the
// most recent past one) plus upcoming events.
export async function GET() {
  await connectDB();
  const [active, upcoming] = await Promise.all([
    Event.findOne({ status: "active" }).sort({ startedAt: -1 }),
    Event.find({ status: "upcoming" }).sort({ date: 1, startTime: 1 }).limit(5),
  ]);
  const event = active ?? (await Event.findOne({ status: "past" }).sort({ date: -1, endedAt: -1 }));

  return NextResponse.json({
    event: event ? toEventJson(event) : null,
    ...(event
      ? await getEventStats(event._id)
      : { stats: null, courseDistribution: [], yearCourseDistribution: [] }),
    upcomingEvents: upcoming.map(toEventJson),
  });
}
