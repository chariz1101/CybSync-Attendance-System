import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { Student } from "@/models/Student";
import { toEventJson } from "@/lib/events";
import { getEventStats } from "@/lib/eventStats";

// GET /api/events/past: ended events, newest first, each with its attendance stats
export async function GET() {
  await connectDB();
  const [events, totalStudents] = await Promise.all([
    Event.find({ status: "past" }).sort({ date: -1, startTime: -1 }).limit(100),
    Student.countDocuments({ status: "active" }),
  ]);

  const result = await Promise.all(
    events.map(async (e) => ({ ...toEventJson(e), ...(await getEventStats(e._id, totalStudents)) }))
  );
  return NextResponse.json({ events: result });
}
