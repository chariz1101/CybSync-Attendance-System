import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";
import { eventInputSchema, toEventJson } from "@/lib/events";
import { canUseEvent, notYourEvent, requireStaff } from "@/lib/staff";
import { resolveOwner } from "@/lib/owners";

type Params = { params: Promise<{ eventId: string }> };

// Allowed status changes. The organization running an event (or an admin) can
// start or end it; reopening lets late scans in after ending by mistake.
const TRANSITIONS: Record<string, string[]> = {
  upcoming: ["active"],
  active: ["past"],
  past: ["active"],
};

const statusSchema = z.object({ status: z.enum(["upcoming", "active", "past"]) });

const notFound = () => NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });

// PATCH /api/events/:id
//   { status: "active" | "past" }  start, end or reopen (the event's organization or an admin)
//   { name, date, ..., ownerId }   edit details or reassign (admin only)
export async function PATCH(req: Request, { params }: Params) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;

  const { eventId } = await params;
  const body = await req.json().catch(() => null);
  const event = isValidObjectId(eventId) ? await Event.findById(eventId) : null;
  if (!event) return notFound();
  if (!canUseEvent(staff, event)) return notYourEvent();

  const statusChange = statusSchema.safeParse(body);
  if (statusChange.success && Object.keys(body).length === 1) {
    const next = statusChange.data.status;
    if (!TRANSITIONS[event.status]?.includes(next)) {
      return NextResponse.json({ success: false, message: `Can't change an ${event.status} event to ${next}.` }, { status: 400 });
    }
    event.status = next;
    if (next === "active") event.startedAt ??= new Date();
    if (next === "past") event.endedAt = new Date();
    await event.save();
    return NextResponse.json({ success: true, event: toEventJson(event) });
  }

  if (!staff.isAdmin) {
    return NextResponse.json({ success: false, message: "Only an admin account can edit event details." }, { status: 403 });
  }
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { ownerId, ...details } = parsed.data;
  event.set(details);
  if (ownerId !== undefined) {
    const resolved = await resolveOwner(ownerId);
    if ("error" in resolved) return NextResponse.json({ success: false, message: resolved.error }, { status: 400 });
    event.set("owner", resolved.owner ?? undefined);
  }
  await event.save();
  return NextResponse.json({ success: true, event: toEventJson(event) });
}

// DELETE /api/events/:id (admin only, and only if nobody has been scanned yet)
export async function DELETE(req: Request, { params }: Params) {
  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof Response) return staff;
  const { eventId } = await params;
  const event = isValidObjectId(eventId) ? await Event.findById(eventId) : null;
  if (!event) return notFound();

  if (await Attendance.exists({ event: event._id })) {
    return NextResponse.json(
      { success: false, message: "This event already has attendance records, so it can't be deleted." },
      { status: 409 }
    );
  }
  await event.deleteOne();
  return NextResponse.json({ success: true });
}
