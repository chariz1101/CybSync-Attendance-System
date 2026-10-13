import { NextResponse } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";
import { ReportAttachment } from "@/models/ReportAttachment";
import { Event } from "@/models/Event";
import { currentUser } from "@/lib/apiAuth";
import { toEventJson } from "@/lib/events";
import { detectFileType, MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES, toReportJson } from "@/lib/reports";

// GET /api/student/reports: the student's own reports, plus the events they can report about
export async function GET(req: Request) {
  const { id } = currentUser(req);
  await connectDB();
  const [reports, events] = await Promise.all([
    Report.find({ student: id }).populate("event").sort({ createdAt: -1 }).limit(100),
    Event.find({ status: { $in: ["active", "past"] } }).sort({ date: -1, startTime: -1 }).limit(100),
  ]);
  return NextResponse.json({
    reports: reports.map(toReportJson),
    events: events.map(toEventJson),
  });
}

const fieldsSchema = z.object({
  type: z.enum(["excuse", "discrepancy"], { message: "Choose what the report is about" }),
  eventId: z.string().refine(isValidObjectId, "Choose the event"),
  message: z.string().trim().min(1, "Describe what happened").max(2000, "Keep the description under 2,000 characters"),
});

// POST /api/student/reports (multipart form: type, eventId, message, files[])
export async function POST(req: Request) {
  const { id: studentId } = currentUser(req);
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ success: false, message: "Invalid form" }, { status: 400 });

  const parsed = fieldsSchema.safeParse({ type: form.get("type"), eventId: form.get("eventId"), message: form.get("message") });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) {
    return NextResponse.json({ success: false, message: `Attach at most ${MAX_FILES} files.` }, { status: 400 });
  }
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
    return NextResponse.json({ success: false, message: "Attachments are too big in total (max 4 MB)." }, { status: 413 });
  }
  const uploads: { filename: string; contentType: string; data: Buffer }[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ success: false, message: `"${file.name}" is bigger than 2 MB.` }, { status: 413 });
    }
    const data = Buffer.from(await file.arrayBuffer());
    const contentType = detectFileType(data);
    if (!contentType) {
      return NextResponse.json({ success: false, message: `"${file.name}" isn't a JPG, PNG, WebP or PDF file.` }, { status: 400 });
    }
    uploads.push({ filename: file.name.slice(0, 200), contentType, data });
  }

  await connectDB();
  const event = await Event.findById(parsed.data.eventId);
  if (!event || event.status === "upcoming") {
    return NextResponse.json({ success: false, message: "Choose an event that has already started." }, { status: 400 });
  }

  const reportId = new Types.ObjectId();
  const saved = await ReportAttachment.insertMany(uploads.map((u) => ({ ...u, size: u.data.length, report: reportId })));
  const report = await Report.create({
    _id: reportId,
    student: studentId,
    event: event._id,
    type: parsed.data.type,
    message: parsed.data.message,
    attachments: saved.map((a) => ({ id: a._id, filename: a.filename, contentType: a.contentType, size: a.size })),
  });
  await report.populate("event");
  return NextResponse.json({ success: true, report: toReportJson(report) }, { status: 201 });
}
