import { Schema, model, models } from "mongoose";

// Failed login counters for rate limiting. MongoDB deletes each document
// automatically once it expires (TTL index).
const LoginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const LoginAttempt = models.LoginAttempt || model("LoginAttempt", LoginAttemptSchema);
