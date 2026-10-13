import { Schema, model, models } from "mongoose";

const StudentSchema = new Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    // Card number typed by the USB RFID reader. Unique, but optional until a card is linked.
    rfid: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    course: { type: String, trim: true },
    year: { type: String, trim: true },
    section: { type: String, trim: true },
    // School Google email; student login matches against it.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export const Student = models.Student || model("Student", StudentSchema);
