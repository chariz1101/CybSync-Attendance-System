import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";
import "@/models/Student";
import "@/models/Event";
import { toReportJson } from "@/lib/reports";

// GET /api/reports: pending reports (oldest first, so they're handled in order) and the latest reviewed ones
export async function GET() {
  await connectDB();
  const [pending, previous] = await Promise.all([
    Report.find({ status: "pending" }).populate("student").populate("event").sort({ createdAt: 1 }),
    Report.find({ status: { $in: ["resolved", "rejected"] } }).populate("student").populate("event").sort({ reviewedAt: -1 }).limit(100),
  ]);
  return NextResponse.json({ pendingReports: pending.map(toReportJson), previousReports: previous.map(toReportJson) });
}
