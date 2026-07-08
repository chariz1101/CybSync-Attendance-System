import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Event } from "@/models/Event";

export async function GET(req: Request) {
  await connectDB();
  const studentId = req.headers.get("x-user-id");
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const totalEvents = await Attendance.countDocuments({ student: studentId });
  const onTimeCount = await Attendance.countDocuments({ student: studentId, status: "on-time" });
  const lateCount = await Attendance.countDocuments({ student: studentId, status: "late" });
  const total = onTimeCount + lateCount || 1;

  const attendanceHistory = await Attendance.find({ student: studentId })
    .populate("event")
    .sort({ checkInTime: -1 })
    .limit(20);

  const upcomingEvents = await Event.find({ status: "upcoming" }).sort({ date: 1 }).limit(5);

  return NextResponse.json({
    stats: {
      totalEvents,
      lateAttendanceRate: Math.round((lateCount / total) * 100),
      onTimeAttendanceRate: Math.round((onTimeCount / total) * 100),
    },
    attendanceHistory: attendanceHistory.map((a) => ({
      id: a.id,
      type: a.type,
      event: (a.event as any)?.name,
      date: (a.event as any)?.date ? (a.event as any).date.toDateString() : "",
      time: a.checkInTime.toTimeString().slice(0, 5),
      status: a.status,
    })),
    upcomingEvents: upcomingEvents.map((e) => ({ id: e.id, name: e.name, date: e.date?.toDateString() || "" })),
  });
}