import { Schema, model, models } from "mongoose";

const ReportSchema = new Schema(
  {
    studentId: String,
    studentName: String,
    course: String,
    year: String,
    section: String,
    eventName: String,
    eventDate: String,
    message: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    attachments: [String],
    status: { type: String, enum: ["pending", "resolved", "rejected"], default: "pending" },
    response: String,
  },
  { timestamps: true }
);

export const Report = models.Report || model("Report", ReportSchema);