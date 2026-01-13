import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["upcoming", "active", "past"], default: "upcoming" },
    date: Date,
    startTime: String,
    endTime: String,
    code: { type: String, unique: true, sparse: true },
    participants: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Event = models.Event || model("Event", EventSchema);