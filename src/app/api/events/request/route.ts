import { NextResponse } from "next/server";
import { z } from "zod";
import { EventRequest } from "@/models/EventRequest";
import { requireStaff, staffRef } from "@/lib/staff";

const schema = z.object({
  eventTitle: z.string().trim().min(1, "Event title is required"),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  location: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
});

// POST /api/events/request: an organization asks the admin to add an event
export async function POST(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  if (staff.isAdmin) {
    return NextResponse.json({ success: false, message: "Admins don't need to request events. Create them on the Events page." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const created = await EventRequest.create({ ...parsed.data, requestedBy: staffRef(staff) });
  return NextResponse.json({ success: true, requestId: created.id, message: "Event request submitted" }, { status: 201 });
}
