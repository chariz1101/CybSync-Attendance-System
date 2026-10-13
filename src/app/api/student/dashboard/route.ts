import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Event } from "@/models/Event";
import { currentUser } from "@/lib/apiAuth";
import { toEventJson } from "@/lib/events";
import { studentHistory, studentStats } from "@/lib/studentAttendance";

// GET /api/student/dashboard: stats, the 10 latest records, and upcoming events
export async function GET(req: Request) {
  const { id } = currentUser(req);
  await connectDB();
  const [records, upcoming] = await Promise.all([
    Attendance.find({ student: id }).populate("event").sort({ checkInTime: -1 }).limit(1000),
    Event.find({ status: { $in: ["upcoming", "active"] } }).sort({ date: 1, startTime: 1 }).limit(5),
  ]);
  return NextResponse.json({
    stats: studentStats(records),
    attendanceHistory: studentHistory(records.slice(0, 10)),
    upcomingEvents: upcoming.map(toEventJson),
  });
}
