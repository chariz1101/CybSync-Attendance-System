import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Student } from "@/models/Student";
import { Event } from "@/models/Event";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const records = await Attendance.find({ event: eventId }).populate("student").populate("event").sort({ checkInTime: -1 });
  return NextResponse.json({
    event: await Event.findById(eventId),
    records: records.map((r) => ({
      id: r.id,
      student: (r.student as any)?.name,
      studentId: (r.student as any)?.studentId,
      course: (r.student as any)?.course,
      year: (r.student as any)?.year,
      section: (r.student as any)?.section,
      type: r.type,
      action: r.action,
      timestamp: r.checkInTime,
      status: r.status,
    })),
  });
}