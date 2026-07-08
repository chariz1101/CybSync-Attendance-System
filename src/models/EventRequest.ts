import { Schema, model, models } from "mongoose";

const EventRequestSchema = new Schema(
  {
    eventTitle: { type: String, required: true },
    dateStart: String,
    dateEnd: String,
    timeStart: String,
    timeEnd: String,
    location: String,
    shortDescription: String,
    requestedBy: {
      userId: String,
      name: String,
    },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNotes: String,
  },
  { timestamps: true }
);

export const EventRequest = models.EventRequest || model("EventRequest", EventRequestSchema);