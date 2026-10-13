import { z } from "zod";
import { DEFAULT_GRACE_MINUTES } from "@/lib/late";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export const eventInputSchema = z
  .object({
    name: z.string().trim().min(1, "Event name is required"),
    date: z.string().regex(DATE, "Start date is required"),
    endDate: z.string().regex(DATE).optional().or(z.literal("")),
    startTime: z.string().regex(TIME).optional().or(z.literal("")),
    endTime: z.string().regex(TIME).optional().or(z.literal("")),
    pmStartTime: z.string().regex(TIME).optional().or(z.literal("")),
    graceMinutes: z.coerce.number().int().min(0, "Grace period can't be negative").max(240, "Grace period is too long").optional(),
    location: z.string().trim().optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (e) => !e.endDate || `${e.endDate}T${e.endTime || "23:59"}` > `${e.date}T${e.startTime || "00:00"}`,
    { message: "The end must be after the start", path: ["endDate"] }
  );

type EventDoc = {
  id: string;
  name: string;
  status: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pmStartTime?: string;
  graceMinutes?: number;
  location?: string;
  description?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdBy?: { name?: string };
};

export function toEventJson(e: EventDoc) {
  return {
    id: e.id,
    name: e.name,
    status: e.status as "upcoming" | "active" | "past",
    date: e.date ?? "",
    endDate: e.endDate ?? "",
    startTime: e.startTime ?? "",
    endTime: e.endTime ?? "",
    pmStartTime: e.pmStartTime ?? "",
    graceMinutes: e.graceMinutes ?? DEFAULT_GRACE_MINUTES,
    location: e.location ?? "",
    description: e.description ?? "",
    startedAt: e.startedAt?.toISOString() ?? null,
    endedAt: e.endedAt?.toISOString() ?? null,
    createdBy: e.createdBy?.name ?? "",
  };
}

type RequestDoc = {
  id: string;
  eventTitle: string;
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  shortDescription?: string;
  status: string;
  reviewNotes?: string;
  requestedBy?: { name?: string };
  reviewedBy?: { name?: string };
  event?: { toString(): string };
  createdAt: Date;
};

export function toRequestJson(r: RequestDoc) {
  return {
    id: r.id,
    eventTitle: r.eventTitle,
    dateStart: r.dateStart ?? "",
    dateEnd: r.dateEnd ?? "",
    timeStart: r.timeStart ?? "",
    timeEnd: r.timeEnd ?? "",
    location: r.location ?? "",
    shortDescription: r.shortDescription ?? "",
    status: r.status as "pending" | "approved" | "rejected",
    reviewNotes: r.reviewNotes ?? "",
    requestedBy: r.requestedBy?.name ?? "",
    reviewedBy: r.reviewedBy?.name ?? "",
    eventId: r.event?.toString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
