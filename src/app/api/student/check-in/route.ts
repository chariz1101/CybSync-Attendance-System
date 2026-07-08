import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";

const schema = z.object({ eventCode: z.string().min(1) });

export async function POST(req: Request) {
  await connectDB();
  const studentId = req.headers.get("x-user-id");
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

  const event = await Event.findOne({ code: parsed.data.eventCode });
  if (!event) return NextResponse.json({ success: false, message: "Event code not found or expired" }, { status: 404 });
  if (event.status !== "active")
    return NextResponse.json({ success: false, message: "This event is not currently accepting check-ins" }, { status: 400 });

  const existing = await Attendance.findOne({ student: studentId, event: event._id });
  if (existing) return NextResponse.json({ success: false, message: "You have already checked in to this event" }, { status: 409 });

  const checkInTime = new Date();
  const status: "on-time" | "late" = "on-time"; // adjust with real timing logic if needed

  await Attendance.create({
    student: studentId,
    event: event._id,
    type: "AM",
    action: "Sign In",
    checkInTime,
    status,
  });

  return NextResponse.json({
    success: true,
    message: "Successfully checked in",
    eventName: event.name,
    checkInTime: checkInTime.toTimeString().slice(0, 5),
    status,
  });
}