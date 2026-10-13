import { NextResponse } from "next/server";
import { EventRequest } from "@/models/EventRequest";
import { toRequestJson } from "@/lib/events";
import { requireStaff } from "@/lib/staff";

// GET /api/events/requests: pending first, newest first. Admins see every
// organization's requests; an organization sees only its own.
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;

  const requests = await EventRequest.find(staff.isAdmin ? {} : { "requestedBy.userId": staff.id })
    .sort({ createdAt: -1 })
    .limit(200);
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  requests.sort((a, b) => order[a.status] - order[b.status]);
  return NextResponse.json({ requests: requests.map(toRequestJson) });
}
