import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { EventRequest } from "@/models/EventRequest";

const schema = z.object({
  eventTitle: z.string().min(1),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  location: z.string().optional(),
  shortDescription: z.string().optional(),
});

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

  const created = await EventRequest.create({ ...parsed.data });
  return NextResponse.json({ success: true, requestId: created.id, message: "Event request submitted" });
}