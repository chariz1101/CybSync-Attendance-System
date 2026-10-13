import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EventRequest } from "@/models/EventRequest";
import { toRequestJson } from "@/lib/events";

// GET /api/events/requests: all event requests, pending first, newest first
export async function GET() {
  await connectDB();
  const requests = await EventRequest.find().sort({ createdAt: -1 }).limit(200);
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  requests.sort((a, b) => order[a.status] - order[b.status]);
  return NextResponse.json({ requests: requests.map(toRequestJson) });
}
