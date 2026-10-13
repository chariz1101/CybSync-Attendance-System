import { Schema, model, models, Types } from "mongoose";

// Files attached to a report (photos or PDFs of excuse letters), stored in
// MongoDB so no extra storage service is needed. Kept in their own collection
// so listing reports never loads file contents.
const ReportAttachmentSchema = new Schema(
  {
    report: { type: Types.ObjectId, ref: "Report", required: true, index: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const ReportAttachment = models.ReportAttachment || model("ReportAttachment", ReportAttachmentSchema);
