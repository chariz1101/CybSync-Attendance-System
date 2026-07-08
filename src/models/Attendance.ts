import { Schema, model, models, Types } from "mongoose";

const AttendanceSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "Student", required: true },
    event: { type: Types.ObjectId, ref: "Event", required: true },
    type: { type: String }, // e.g., AM/PM
    action: { type: String }, // Sign In/Sign Out
    checkInTime: { type: Date, default: Date.now },
    status: { type: String, enum: ["on-time", "late", "excused"], default: "on-time" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ student: 1, event: 1, type: 1, action: 1 }, { unique: true });

export const Attendance = models.Attendance || model("Attendance", AttendanceSchema);