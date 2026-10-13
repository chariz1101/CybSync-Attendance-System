import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { EventRequest } from "@/models/EventRequest";
import { currentUserRef, requireAdmin } from "@/lib/apiAuth";
import { eventInputSchema, toEventJson, toRequestJson } from "@/lib/events";

type Params = { params: Promise<{ requestId: string }> };

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().optional(),
});

// POST /api/events/requests/:id  { action: "approve" | "reject", notes? }  (admin only)
// Approving creates the event (status "upcoming") from the request's details.
export async function POST(req: Request, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { requestId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  if (!isValidObjectId(requestId)) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });

  await connectDB();
  const request = await EventRequest.findById(requestId);
  if (!request) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ success: false, message: `This request was already ${request.status}.` }, { status: 409 });
  }

  const reviewer = await currentUserRef(req);
  let event = null;
  if (parsed.data.action === "approve") {
    const details = eventInputSchema.safeParse({
      name: request.eventTitle,
      date: request.dateStart,
      endDate: request.dateEnd || undefined,
      startTime: request.timeStart || undefined,
      endTime: request.timeEnd || undefined,
      location: request.location || undefined,
      description: request.shortDescription || undefined,
    });
    if (!details.success) {
      return NextResponse.json(
        { success: false, message: `Can't create the event: ${details.error.issues[0]?.message}. Reject it and ask for a corrected request.` },
        { status: 400 }
      );
    }
    event = await Event.create({ ...details.data, request: request._id, createdBy: request.requestedBy });
    request.event = event._id;
  }

  request.status = parsed.data.action === "approve" ? "approved" : "rejected";
  request.reviewNotes = parsed.data.notes;
  request.reviewedBy = reviewer;
  request.reviewedAt = new Date();
  await request.save();

  return NextResponse.json({ success: true, request: toRequestJson(request), event: event ? toEventJson(event) : null });
}
