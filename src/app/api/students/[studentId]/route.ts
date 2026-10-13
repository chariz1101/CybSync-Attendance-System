import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { firstIssue, studentUpdateSchema, toStudentJson } from "@/lib/students";

type Params = { params: Promise<{ studentId: string }> };

// PATCH /api/students/:id: edit a student, link a card (rfid: "123...") or unlink it (rfid: "")
export async function PATCH(req: Request, { params }: Params) {
  const { studentId: id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: firstIssue(parsed.error) }, { status: 400 });

  await connectDB();
  const student = await Student.findById(id);
  if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

  const { rfid, email, ...rest } = parsed.data;

  if (rfid) {
    const owner = await Student.findOne({ rfid, _id: { $ne: student._id } });
    if (owner) {
      return NextResponse.json(
        { success: false, message: `This card is already linked to ${owner.name} (${owner.studentId}). Unlink it there first.` },
        { status: 409 }
      );
    }
  }
  if (email && email !== student.email) {
    const owner = await Student.findOne({ email, _id: { $ne: student._id } });
    if (owner) {
      return NextResponse.json(
        { success: false, message: `That email is already used by ${owner.name} (${owner.studentId}).` },
        { status: 409 }
      );
    }
  }

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) student.set(key, value === "" ? undefined : value);
  }
  if (email) student.email = email;
  if (rfid !== undefined) student.set("rfid", rfid === "" ? undefined : rfid);

  try {
    await student.save();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ success: false, message: "That email or RFID card was just taken by another student." }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ success: true, student: toStudentJson(student) });
}
