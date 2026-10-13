import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { Attendance } from "@/models/Attendance";
import { eventInputSchema, toEventJson } from "@/lib/events";
import { requireAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ eventId: string }> };

// Allowed status changes. Any council member can start or end an event (they run
// the scanner at the door); reopening lets late scans in after ending by mistake.
const TRANSITIONS: Record<string, string[]> = {
  upcoming: ["active"],
  active: ["past"],
  past: ["active"],
};

const statusSchema = z.object({ status: z.enum(["upcoming", "active", "past"]) });

async function findEvent(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  return Event.findById(id);
}

// PATCH /api/events/:id
//   { status: "active" | "past" }  start, end or reopen (council or admin)
//   { name, date, ... }            edit details (admin only)
export async function PATCH(req: Request, { params }: Params) {
  const { eventId } = await params;
  const body = await req.json().catch(() => null);
  const event = await findEvent(eventId);
  if (!event) return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });

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

  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  event.set(parsed.data);
  await event.save();
  return NextResponse.json({ success: true, event: toEventJson(event) });
}

// DELETE /api/events/:id (admin only, and only if nobody has been scanned yet)
export async function DELETE(req: Request, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { eventId } = await params;
  const event = await findEvent(eventId);
  if (!event) return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });

  if (await Attendance.exists({ event: event._id })) {
    return NextResponse.json(
      { success: false, message: "This event already has attendance records, so it can't be deleted." },
      { status: 409 }
    );
  }
  await event.deleteOne();
  return NextResponse.json({ success: true });
}
