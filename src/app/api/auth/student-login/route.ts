import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { signToken } from "@/lib/auth";

const schema = z.object({ studentId: z.string().min(1) });

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const student = await Student.findOne({ studentId: parsed.data.studentId });
  if (!student) return NextResponse.json({ success: false, message: "Student ID not found" }, { status: 401 });
  if (student.status !== "active")
    return NextResponse.json({ success: false, message: "Student account is inactive or suspended" }, { status: 403 });

  const token = signToken({ sub: student.id, role: "student" });
  return NextResponse.json({
    success: true,
    token,
    student: {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      course: student.course,
      year: student.year,
      section: student.section,
      email: student.email,
    },
    message: "Login successful",
  });
}