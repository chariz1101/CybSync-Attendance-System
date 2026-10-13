import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Student } from "@/models/Student";
import { Event } from "@/models/Event";

type PopulatedStudent = { name?: string; studentId?: string; course?: string; year?: string; section?: string };

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const records = await Attendance.find({ event: eventId }).populate("student").populate("event").sort({ checkInTime: -1 });
  return NextResponse.json({
    event: await Event.findById(eventId),
    records: records.map((r) => {
      const student = r.student as unknown as PopulatedStudent | null;
      return {
        id: r.id,
        student: student?.name,
        studentId: student?.studentId,
        course: student?.course,
        year: student?.year,
        section: student?.section,
        type: r.type,
        action: r.action,
        timestamp: r.checkInTime,
        status: r.status,
      };
    }),
  });
}