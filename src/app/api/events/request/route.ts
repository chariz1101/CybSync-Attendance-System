import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { EventRequest } from "@/models/EventRequest";
import { currentUserRef } from "@/lib/apiAuth";

const schema = z.object({
  eventTitle: z.string().trim().min(1, "Event title is required"),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  location: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
});

// POST /api/events/request: a council member asks for an event to be added
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const created = await EventRequest.create({ ...parsed.data, requestedBy: await currentUserRef(req) });
  return NextResponse.json({ success: true, requestId: created.id, message: "Event request submitted" }, { status: 201 });
}
