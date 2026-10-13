import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { signToken } from "@/lib/auth";
import { GoogleAuthError, verifyGoogleSchoolAccount } from "@/lib/google";
import { sessionExpiry, setSessionCookie } from "@/lib/session";
import { checkLoginLimit, clearLoginFailures, loginLimitKeys, recordLoginFailure } from "@/lib/rateLimit";

const schema = z.object({
  studentId: z.string().trim().min(1),
  credential: z.string().min(1), // Google Sign-In ID token
  rememberMe: z.boolean().optional().default(false),
});

// Same message whether the ID doesn't exist or belongs to someone else, so the
// login form can't be used to discover which Student IDs are registered.
const MISMATCH_MESSAGE = "That Student ID doesn't match your Google account.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Student ID and Google sign-in are required." }, { status: 400 });
  }

  await connectDB();
  const limits = loginLimitKeys(req, "student", parsed.data.studentId);
  const blocked = await checkLoginLimit([limits.account, limits.ip]);
  if (blocked) return blocked;

  let email: string;
  try {
    ({ email } = await verifyGoogleSchoolAccount(parsed.data.credential));
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      await recordLoginFailure([limits.account, limits.ip]);
      return NextResponse.json({ success: false, message: err.message }, { status: err.status });
    }
    throw err;
  }

  const student = await Student.findOne({ studentId: parsed.data.studentId });
  if (!student || student.email?.toLowerCase() !== email) {
    await recordLoginFailure([limits.account, limits.ip]);
    return NextResponse.json({ success: false, message: MISMATCH_MESSAGE }, { status: 401 });
  }
  await clearLoginFailures(limits.account);
  if (student.status !== "active") {
    return NextResponse.json({ success: false, message: "Student account is inactive or suspended" }, { status: 403 });
  }

  const { rememberMe } = parsed.data;
  const token = signToken({ sub: student.id, role: "student" }, sessionExpiry(rememberMe));
  const res = NextResponse.json({
    success: true,
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
  setSessionCookie(res, token, rememberMe);
  return res;
}
