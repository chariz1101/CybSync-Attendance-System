import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { EventRequest } from "@/models/EventRequest";
import { hashPassword } from "@/lib/auth";
import { isDuplicateKeyError } from "@/lib/apiAuth";
import { accountCreateSchema, toAccountJson } from "@/lib/accounts";
import { requireStaff } from "@/lib/staff";

// GET /api/accounts: every admin and organization account, with event/request counts (admin only)
export async function GET(req: Request) {
  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof Response) return staff;

  const [users, eventCounts, pendingCounts] = await Promise.all([
    User.find().sort({ role: 1, name: 1 }),
    Event.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$owner.userId", n: { $sum: 1 } } }]),
    EventRequest.aggregate<{ _id: string; n: number }>([{ $match: { status: "pending" } }, { $group: { _id: "$requestedBy.userId", n: { $sum: 1 } } }]),
  ]);
  const events = new Map(eventCounts.map((c) => [c._id, c.n]));
  const pending = new Map(pendingCounts.map((c) => [c._id, c.n]));

  return NextResponse.json({
    accounts: users.map((u) => ({ ...toAccountJson(u), events: events.get(u.id) ?? 0, pendingRequests: pending.get(u.id) ?? 0 })),
  });
}

// POST /api/accounts: create an organization (or another admin) account (admin only)
export async function POST(req: Request) {
  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof Response) return staff;

  const parsed = accountCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { password, ...fields } = parsed.data;
  try {
    const user = await User.create({ ...fields, passwordHash: await hashPassword(password) });
    return NextResponse.json({ success: true, account: toAccountJson(user) }, { status: 201 });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json({ success: false, message: `The username "${fields.username}" is already taken.` }, { status: 409 });
    }
    throw err;
  }
}
