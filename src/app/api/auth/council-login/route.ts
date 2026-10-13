import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword, signToken } from "@/lib/auth";
import { sessionExpiry, setSessionCookie } from "@/lib/session";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ username: parsed.data.username });
  const ok = user ? await comparePassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ success: false, message: "Incorrect username or password." }, { status: 401 });
  }

  const { rememberMe } = parsed.data;
  const token = signToken({ sub: user.id, role: user.role }, sessionExpiry(rememberMe));
  const res = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role, name: user.name },
    message: "Login successful",
  });
  setSessionCookie(res, token, rememberMe);
  return res;
}
