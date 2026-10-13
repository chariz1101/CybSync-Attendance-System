import { Schema, model, models, Types } from "mongoose";

const EventSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // upcoming → active (scanner accepts cards) → past
    status: { type: String, enum: ["upcoming", "active", "past"], default: "upcoming" },
    // Calendar dates as "YYYY-MM-DD" and times as "HH:mm" (local school time), so
    // they never shift between time zones.
    date: { type: String, required: true },
    endDate: String,
    startTime: String,
    endTime: String,
    // Afternoon session start, for events with separate AM/PM sign-ins.
    pmStartTime: String,
    // Sign-ins later than start time + grace minutes are marked late.
    graceMinutes: { type: Number, default: 15, min: 0 },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    request: { type: Types.ObjectId, ref: "EventRequest" },
    createdBy: { userId: String, name: String },
    // The organization (council account) that runs this event: the requester for
    // approved requests, or whoever the admin assigned. Absent = admin-run.
    owner: { type: { userId: String, name: String }, default: undefined },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

export const Event = models.Event || model("Event", EventSchema);
