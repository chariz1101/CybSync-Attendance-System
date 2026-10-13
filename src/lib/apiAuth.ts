import { NextResponse } from "next/server";
import { User } from "@/models/User";

/** The logged-in user, as verified and set by the proxy. */
export function currentUser(req: Request) {
  return { id: req.headers.get("x-user-id") ?? "", role: req.headers.get("x-user-role") ?? "" };
}

/** Returns a 403 response unless the logged-in user is an admin. */
export function requireAdmin(req: Request) {
  if (currentUser(req).role === "admin") return null;
  return NextResponse.json({ success: false, message: "Only an admin account can do this." }, { status: 403 });
}

/** { userId, name } of the logged-in council/admin user, for "requested by" / "reviewed by" fields. */
export async function currentUserRef(req: Request) {
  const { id } = currentUser(req);
  const user = id ? await User.findById(id) : null;
  return { userId: id, name: user?.name ?? "Unknown" };
}

export function isDuplicateKeyError(err: unknown) {
  return (err as { code?: number })?.code === 11000;
}
