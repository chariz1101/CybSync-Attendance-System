import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Event } from "@/models/Event";
import "@/models/Student"; // registers the model for .populate("student")
import { toEventJson } from "@/lib/events";
import { getEventStats } from "@/lib/eventStats";
import { toRecordJson } from "@/lib/attendance";

// GET /api/attendance/records?eventId=…: an event's attendance records (newest first) and stats
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId || !isValidObjectId(eventId)) {
    return NextResponse.json({ success: false, message: "eventId is required" }, { status: 400 });
  }

  await connectDB();
  const event = await Event.findById(eventId);
  if (!event) return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });

  const [records, stats] = await Promise.all([
    Attendance.find({ event: event._id }).populate("student").sort({ checkInTime: -1 }).limit(2000),
    getEventStats(event._id),
  ]);

  return NextResponse.json({ event: toEventJson(event), ...stats, records: records.map(toRecordJson) });
}
