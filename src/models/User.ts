import { Schema, model, models } from "mongoose";

// Staff accounts. "admin" runs the whole system and approves event requests;
// "council" is an organization / student council that requests and runs its own events.
const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    // Shown everywhere as the account's name, e.g. the organization's name.
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["council", "admin"], default: "council" },
    // Disabled accounts can't log in or use the API.
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
