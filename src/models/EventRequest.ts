import { Schema, model, models, Types } from "mongoose";

const EventRequestSchema = new Schema(
  {
    eventTitle: { type: String, required: true, trim: true },
    dateStart: String,
    dateEnd: String,
    timeStart: String,
    timeEnd: String,
    location: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    requestedBy: {
      userId: String,
      name: String,
    },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNotes: String,
    reviewedBy: { userId: String, name: String },
    reviewedAt: Date,
    // The event created when the request was approved.
    event: { type: Types.ObjectId, ref: "Event" },
  },
  { timestamps: true }
);

export const EventRequest = models.EventRequest || model("EventRequest", EventRequestSchema);
