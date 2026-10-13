import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Student } from "@/models/Student";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";
import { scanSchema, toRecordJson } from "@/lib/attendance";
import { isDuplicateKeyError } from "@/lib/apiAuth";
import { attendanceStatus } from "@/lib/late";
import { canUseEvent, notYourEvent, requireStaff } from "@/lib/staff";

// POST /api/attendance/scan  { rfid, eventId, type: "AM"|"PM", action: "Sign In"|"Sign Out" }
// `rfid` is the card number typed by the USB reader, or a Student ID typed by hand.
export async function POST(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  const parsed = scanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { rfid, eventId, type, action } = parsed.data;

  const event = isValidObjectId(eventId) ? await Event.findById(eventId) : null;
  if (!event) return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
  if (!canUseEvent(staff, event)) return notYourEvent();
  if (event.status !== "active") {
    return NextResponse.json({ success: false, message: "This event isn't running. Start it on the Events page first." }, { status: 400 });
  }

  const student = await Student.findOne({ $or: [{ rfid }, { studentId: rfid }] });
  if (!student) {
    return NextResponse.json({ success: false, message: `No student has card or ID "${rfid}". Link the card on the Students page.`, rfid }, { status: 404 });
  }
  if (student.status !== "active") {
    return NextResponse.json({ success: false, message: `${student.name} is marked ${student.status}.` }, { status: 403 });
  }

  const checkInTime = new Date();
  try {
    const attendance = await Attendance.create({
      student: student._id,
      event: event._id,
      type,
      action,
      checkInTime,
      status: attendanceStatus(event, type, action, checkInTime),
    });
    attendance.student = student;
    return NextResponse.json({ success: true, message: "Recorded", record: toRecordJson(attendance) });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const previous = await Attendance.findOne({ student: student._id, event: event._id, type, action });
    return NextResponse.json(
      {
        success: false,
        message: `${student.name} was already scanned for ${type} ${action}.`,
        previousTimestamp: previous?.checkInTime?.toISOString() ?? null,
      },
      { status: 409 }
    );
  }
}
