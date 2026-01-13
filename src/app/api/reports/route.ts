import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";

export async function GET() {
  await connectDB();
  const pendingReports = await Report.find({ status: "pending" }).sort({ createdAt: -1 });
  const previousReports = await Report.find({ status: { $in: ["resolved", "rejected"] } }).sort({ updatedAt: -1 });

  return NextResponse.json({
    pendingReports: pendingReports.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      studentId: r.studentId,
      course: r.course,
      year: r.year,
      section: r.section,
      eventName: r.eventName,
      eventDate: r.eventDate,
      message: r.message,
      priority: r.priority,
      attachments: r.attachments,
    })),
    previousReports: previousReports.map((r) => ({
      id: r.id,
      eventName: r.eventName,
      eventDate: r.eventDate,
      message: r.message,
      status: r.status === "resolved" ? "resolved" : "rejected",
    })),
  });
}
