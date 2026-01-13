import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";

export async function GET(req: Request) {
  await connectDB();
  const studentId = req.headers.get("x-user-id");
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const totalEvents = await Attendance.countDocuments({ student: studentId });
  const lateAttendance = await Attendance.countDocuments({ student: studentId, status: "late" });
  const onTimeAttendance = await Attendance.countDocuments({ student: studentId, status: "on-time" });

  const attendanceHistory = await Attendance.find({ student: studentId })
    .populate("event")
    .sort({ checkInTime: -1 });

  return NextResponse.json({
    stats: { totalEvents, lateAttendance, onTimeAttendance },
    attendanceHistory: attendanceHistory.map((a) => ({
      id: a.id,
      type: a.type,
      event: (a.event as any)?.name,
      date: a.checkInTime.toDateString(),
      time: a.checkInTime.toTimeString().slice(0, 5),
      status: a.status,
    })),
  });
}