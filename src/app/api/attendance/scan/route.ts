import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";

const schema = z.object({
  rfid: z.string().min(1),
  eventId: z.string().min(1),
  type: z.string().optional(),
  action: z.string().optional(),
  timestamp: z.string().optional(),
});

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

  const student = await Student.findOne({ $or: [{ rfid: parsed.data.rfid }, { studentId: parsed.data.rfid }] });
  if (!student) return NextResponse.json({ success: false, message: "Student not found", rfid: parsed.data.rfid }, { status: 404 });

  const event = await Event.findById(parsed.data.eventId);
  if (!event) return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
  if (event.status === "past") return NextResponse.json({ success: false, message: "Event not active" }, { status: 400 });

  const checkInTime = parsed.data.timestamp ? new Date(parsed.data.timestamp) : new Date();

  try {
    const attendance = await Attendance.create({
      student: student._id,
      event: event._id,
      type: parsed.data.type,
      action: parsed.data.action,
      checkInTime,
      status: "on-time",
    });

    return NextResponse.json({
      success: true,
      message: "Recorded",
      student: { name: student.name, course: student.course, year: student.year, section: student.section },
      event: { name: event.name },
      timestamp: checkInTime.toISOString(),
      attendanceId: attendance.id,
    });
  } catch (err: any) {
    if (err.code === 11000)
      return NextResponse.json({ success: false, message: "Duplicate entry", previousTimestamp: checkInTime.toISOString() }, { status: 409 });
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}