import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { currentUser } from "@/lib/apiAuth";

export type Staff = { id: string; name: string; role: "admin" | "council"; isAdmin: boolean };

/**
 * The logged-in admin or organization account, loaded from the database so a
 * disabled or deleted account is refused even while its session cookie is valid.
 * Returns a Response to send back when the request isn't allowed.
 */
export async function requireStaff(req: Request, opts: { adminOnly?: boolean } = {}): Promise<Staff | Response> {
  const { id } = currentUser(req);
  await connectDB();
  const user = id ? await User.findById(id).catch(() => null) : null;
  if (!user || user.status === "disabled") {
    return NextResponse.json({ success: false, message: "This account is disabled or no longer exists." }, { status: 401 });
  }
  if (opts.adminOnly && user.role !== "admin") {
    return NextResponse.json({ success: false, message: "Only an admin account can do this." }, { status: 403 });
  }
  return { id: user.id, name: user.name, role: user.role, isAdmin: user.role === "admin" };
}

/** { userId, name } for "requested by" / "reviewed by" / owner fields. */
export const staffRef = (s: Staff) => ({ userId: s.id, name: s.name });

/**
 * MongoDB filter for the events an account may see: all of them for admins,
 * only the organization's own events otherwise. Events made before owners were
 * recorded fall back to who created them.
 */
export function eventFilterFor(s: Staff): Record<string, unknown> {
  if (s.isAdmin) return {};
  return { $or: [{ "owner.userId": s.id }, { owner: { $exists: false }, "createdBy.userId": s.id }] };
}

type OwnedEvent = { owner?: { userId?: string } | null; createdBy?: { userId?: string } | null };

export function eventOwnerId(e: OwnedEvent) {
  return e.owner?.userId ?? e.createdBy?.userId ?? null;
}

/** Can this account see and run this event? */
export function canUseEvent(s: Staff, e: OwnedEvent) {
  return s.isAdmin || eventOwnerId(e) === s.id;
}

export const notYourEvent = () =>
  NextResponse.json({ success: false, message: "This event belongs to another organization." }, { status: 403 });
