import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Report } from "@/models/Report";
import { Attendance } from "@/models/Attendance";
import { Event } from "@/models/Event";
import { canUseEvent, notYourEvent, requireStaff, staffRef } from "@/lib/staff";

type Params = { params: Promise<{ reportId: string }> };

const schema = z.object({ response: z.string().trim().max(2000).optional() });

// POST /api/reports/:id/accept  { response? }
// For an excuse letter about an event, the student's late records for that
// event become "excused"; if they have no record at all (absent), an excused
// record is added. Discrepancies are marked resolved for the council to fix.
export async function POST(req: Request, { params }: Params) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  const { reportId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  if (!isValidObjectId(reportId)) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  const report = await Report.findById(reportId);
  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  const event = report.event ? await Event.findById(report.event) : null;
  if (!staff.isAdmin && (!event || !canUseEvent(staff, event))) return notYourEvent();
  if (report.status !== "pending") {
    return NextResponse.json({ success: false, message: "This report was already reviewed." }, { status: 409 });
  }

  let excused = 0;
  if (report.type === "excuse" && report.event) {
    const filter = { student: report.student, event: report.event };
    const late = await Attendance.updateMany({ ...filter, status: "late" }, { status: "excused" });
    excused = late.modifiedCount;
    if (!(await Attendance.exists(filter))) {
      await Attendance.create({ ...filter, action: "Excused", status: "excused", checkInTime: new Date() });
      excused = 1;
    }
  }

  report.status = "resolved";
  report.response = parsed.data.response;
  report.reviewedBy = staffRef(staff);
  report.reviewedAt = new Date();
  await report.save();
  return NextResponse.json({ success: true, reportId: report.id, status: report.status, excusedRecords: excused });
}
