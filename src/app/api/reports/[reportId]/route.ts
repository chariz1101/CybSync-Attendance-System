import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";

type Params = { params: Promise<{ reportId: string }> };

export async function POST(_: Request, { params }: Params) {
  const { reportId } = await params;
  await connectDB();
  const updated = await Report.findByIdAndUpdate(
    reportId,
    { status: "resolved", updatedAt: new Date() },
    { new: true }
  );
  if (!updated) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  return NextResponse.json({ success: true, reportId: updated.id, status: updated.status });
}