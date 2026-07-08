import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["council", "admin"], default: "council" },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);