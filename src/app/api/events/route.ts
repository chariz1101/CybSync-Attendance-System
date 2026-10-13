import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { eventInputSchema, toEventJson } from "@/lib/events";
import { currentUserRef, requireAdmin } from "@/lib/apiAuth";

const STATUSES = ["upcoming", "active", "past"];

// GET /api/events?status=active  (comma-separated statuses; default: all)
export async function GET(req: Request) {
  const statusParam = new URL(req.url).searchParams.get("status");
  const statuses = statusParam?.split(",").filter((s) => STATUSES.includes(s));

  await connectDB();
  const events = await Event.find(statuses?.length ? { status: { $in: statuses } } : {}).sort({ date: 1, startTime: 1 });
  return NextResponse.json({ events: events.map(toEventJson) });
}

// POST /api/events: create an event directly (admin only)
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const parsed = eventInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const event = await Event.create({ ...parsed.data, createdBy: await currentUserRef(req) });
  return NextResponse.json({ success: true, event: toEventJson(event) }, { status: 201 });
}
