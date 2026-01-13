import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { Attendance } from "@/models/Attendance";
import { Event } from "@/models/Event";

const courseColors: Record<string, string> = {
  CS: "#EF4444",
  IT: "#06B6D4",
  IS: "#A855F7",
  EMC: "#22C55E",
  BLIS: "#F97316",
};

export async function GET() {
  await connectDB();

  const totalDepartmentStudents = await Student.countDocuments();
  const totalStudentsAttended = await Attendance.distinct("student").then((ids) => ids.length);
  const attendanceRate = totalDepartmentStudents
    ? Math.round((totalStudentsAttended / totalDepartmentStudents) * 100)
    : 0;

  const courseAgg = await Student.aggregate([{ $group: { _id: "$course", value: { $sum: 1 } } }]);
  const courseDistribution = courseAgg.map((c) => ({
    course: c._id || "N/A",
    value: c.value,
    color: courseColors[c._id as string] || "#94A3B8",
  }));

  const yearAgg = await Student.aggregate([{ $group: { _id: "$year", count: { $sum: 1 } } }]);
  const yearCourseDistribution = yearAgg.map((y) => ({ year: y._id || "N/A", courseA: y.count, courseB: 0 }));

  const upcoming = await Event.find({ status: "upcoming" }).sort({ date: 1 }).limit(5);
  const event = await Event.findOne({ status: "active" }).sort({ updatedAt: -1 });

  return NextResponse.json({
    event: event ? { name: event.name, date: event.date?.toDateString() || "" } : { name: "N/A", date: "" },
    stats: { totalDepartmentStudents, totalStudentsAttended, attendanceRate },
    courseDistribution,
    yearCourseDistribution,
    upcomingEvents: upcoming.map((e) => ({ id: e.id, name: e.name, date: e.date?.toDateString() || "" })),
  });
}