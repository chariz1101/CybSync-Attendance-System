import { NextResponse } from "next/server";
import { Report } from "@/models/Report";
import "@/models/Student";
import { Event } from "@/models/Event";
import { eventFilterFor, requireStaff } from "@/lib/staff";
import { toReportJson } from "@/lib/reports";

// GET /api/reports: pending reports (oldest first, so they're handled in order) and the latest reviewed ones.
// Admins see all; an organization sees reports about its own events.
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;

  const about = staff.isAdmin ? {} : { event: { $in: await Event.find(eventFilterFor(staff)).distinct("_id") } };
  const [pending, previous] = await Promise.all([
    Report.find({ ...about, status: "pending" }).populate("student").populate("event").sort({ createdAt: 1 }),
    Report.find({ ...about, status: { $in: ["resolved", "rejected"] } }).populate("student").populate("event").sort({ reviewedAt: -1 }).limit(100),
  ]);
  return NextResponse.json({ pendingReports: pending.map(toReportJson), previousReports: previous.map(toReportJson) });
}
