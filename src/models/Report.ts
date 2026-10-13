import { Schema, model, models, Types } from "mongoose";

// A student's report to the council: an excuse letter for an event they
// missed or were late to, or a discrepancy they noticed in their record.
const ReportSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "Student", required: true },
    event: { type: Types.ObjectId, ref: "Event" },
    type: { type: String, enum: ["excuse", "discrepancy"], required: true },
    message: { type: String, required: true, trim: true },
    attachments: [
      {
        _id: false,
        id: { type: Types.ObjectId, ref: "ReportAttachment" },
        filename: String,
        contentType: String,
        size: Number,
      },
    ],
    // resolved = accepted by the council
    status: { type: String, enum: ["pending", "resolved", "rejected"], default: "pending" },
    response: { type: String, trim: true },
    reviewedBy: { userId: String, name: String },
    reviewedAt: Date,
  },
  { timestamps: true }
);

ReportSchema.index({ student: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = models.Report || model("Report", ReportSchema);
