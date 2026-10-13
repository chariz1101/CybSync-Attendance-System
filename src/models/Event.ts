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
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    request: { type: Types.ObjectId, ref: "EventRequest" },
    createdBy: { userId: String, name: String },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

export const Event = models.Event || model("Event", EventSchema);
