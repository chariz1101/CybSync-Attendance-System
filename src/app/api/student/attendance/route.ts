import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import "@/models/Event";
import { currentUser } from "@/lib/apiAuth";
import { studentHistory, studentStats } from "@/lib/studentAttendance";

// GET /api/student/attendance: the logged-in student's full attendance history
export async function GET(req: Request) {
  const { id } = currentUser(req);
  await connectDB();
  const records = await Attendance.find({ student: id }).populate("event").sort({ checkInTime: -1 }).limit(1000);
  return NextResponse.json({ stats: studentStats(records), attendanceHistory: studentHistory(records) });
}
