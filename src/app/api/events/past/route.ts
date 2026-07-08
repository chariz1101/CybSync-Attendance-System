import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";

export async function GET() {
  await connectDB();
  const events = await Event.find({ status: "past" }).sort({ date: -1 });

  const result = await Promise.all(
    events.map(async (e) => {
      const attended = await Attendance.countDocuments({ event: e._id });
      return {
        id: e.id,
        name: e.name,
        date: e.date?.toDateString() || "",
        participants: attended,
        stats: { totalDepartmentStudents: 0, totalStudentsAttended: attended, attendanceRate: 0 },
        courseDistribution: [],
        yearCourseDistribution: [],
      };
    })
  );

  return NextResponse.json({ events: result });
}