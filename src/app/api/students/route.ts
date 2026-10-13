import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { firstIssue, studentInputSchema, toStudentJson } from "@/lib/students";

const PAGE_SIZE = 25;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/students?q=juan&card=linked|unlinked&page=1
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const card = searchParams.get("card");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const filter: Record<string, unknown> = {};
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ studentId: re }, { name: re }, { email: re }, { course: re }, { section: re }, { rfid: q }];
  }
  if (card === "linked") filter.rfid = { $exists: true };
  if (card === "unlinked") filter.rfid = { $exists: false };

  await connectDB();
  const [total, students, linkedCount, allCount] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .sort({ studentId: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Student.countDocuments({ rfid: { $exists: true } }),
    Student.estimatedDocumentCount(),
  ]);

  return NextResponse.json({
    students: students.map(toStudentJson),
    page,
    pageSize: PAGE_SIZE,
    total,
    totals: { students: allCount, withCard: linkedCount },
  });
}

// POST /api/students: add one student
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = studentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: firstIssue(parsed.error) }, { status: 400 });

  await connectDB();
  const { studentId, email, rfid } = parsed.data;
  const conflict = await Student.findOne({ $or: [{ studentId }, { email }, ...(rfid ? [{ rfid }] : [])] });
  if (conflict) {
    const what = conflict.studentId === studentId ? "Student ID" : conflict.email === email ? "email" : "RFID card";
    return NextResponse.json(
      { success: false, message: `That ${what} is already used by ${conflict.name} (${conflict.studentId}).` },
      { status: 409 }
    );
  }

  let student;
  try {
    student = await Student.create(parsed.data);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ success: false, message: "That Student ID, email or RFID card is already in use." }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ success: true, student: toStudentJson(student) }, { status: 201 });
}
