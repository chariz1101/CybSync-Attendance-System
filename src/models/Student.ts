import { Schema, model, models } from "mongoose";

const StudentSchema = new Schema(
  {
    studentId: { type: String, required: true, unique: true },
    rfid: { type: String, index: true },
    name: { type: String, required: true },
    course: String,
    year: String,
    section: String,
    email: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export const Student = models.Student || model("Student", StudentSchema);