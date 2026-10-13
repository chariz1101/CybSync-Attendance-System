import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { eventInputSchema, toEventJson } from "@/lib/events";
import { eventFilterFor, requireStaff, staffRef } from "@/lib/staff";
import { resolveOwner } from "@/lib/owners";

const STATUSES = ["upcoming", "active", "past"];

// GET /api/events?status=active  (comma-separated statuses; default: all).
// Admins see every event; organizations see only their own.
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;

  const statusParam = new URL(req.url).searchParams.get("status");
  const statuses = statusParam?.split(",").filter((s) => STATUSES.includes(s));
  const events = await Event.find({ ...eventFilterFor(staff), ...(statuses?.length ? { status: { $in: statuses } } : {}) }).sort({
    date: 1,
    startTime: 1,
  });
  return NextResponse.json({ events: events.map(toEventJson) });
}

// POST /api/events: create an event directly (admin only), optionally run by an organization
export async function POST(req: Request) {
  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof Response) return staff;

  const parsed = eventInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { ownerId, ...details } = parsed.data;
  const resolved = await resolveOwner(ownerId);
  if ("error" in resolved) return NextResponse.json({ success: false, message: resolved.error }, { status: 400 });

  const event = await Event.create({ ...details, createdBy: staffRef(staff), ...(resolved.owner ? { owner: resolved.owner } : {}) });
  return NextResponse.json({ success: true, event: toEventJson(event) }, { status: 201 });
}
