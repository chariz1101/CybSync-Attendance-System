import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Student } from "@/models/Student";

// Returns the logged-in user for the sidebars. The proxy has already
// verified the session and set x-user-id / x-user-role.
export async function GET(req: Request) {
  const id = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!id || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  if (role === "student") {
    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({
      role,
      name: student.name,
      studentId: student.studentId,
      course: student.course,
      year: student.year,
      section: student.section,
      email: student.email,
    });
  }

  const user = await User.findById(id);
  if (!user || user.status === "disabled") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: user.id, role: user.role, name: user.name, username: user.username });
}
