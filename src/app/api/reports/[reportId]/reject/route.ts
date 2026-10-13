import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Report } from "@/models/Report";
import { Event } from "@/models/Event";
import { canUseEvent, notYourEvent, requireStaff, staffRef } from "@/lib/staff";

type Params = { params: Promise<{ reportId: string }> };

const schema = z.object({ reason: z.string().trim().max(2000).optional() });

// POST /api/reports/:id/reject  { reason? }  (the reason is shown to the student)
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

  report.status = "rejected";
  report.response = parsed.data.reason;
  report.reviewedBy = staffRef(staff);
  report.reviewedAt = new Date();
  await report.save();
  return NextResponse.json({ success: true, reportId: report.id, status: report.status });
}
