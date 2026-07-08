import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";

export async function GET() {
  await connectDB();
  const events = await Event.find({ status: "upcoming" }).sort({ date: 1 });
  return NextResponse.json({ events: events.map((e) => ({ id: e.id, name: e.name, date: e.date?.toDateString() || "" })) });
}