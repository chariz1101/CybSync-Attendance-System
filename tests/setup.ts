import { randomUUID } from "node:crypto";
import { afterAll, inject } from "vitest";
import mongoose from "mongoose";

// Each test file uses its own database, so files can run in parallel.
process.env.MONGODB_URI = `${inject("mongoUri")}test_${randomUUID().slice(0, 8)}`;
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAIN = "school.edu.ph";
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.SCHOOL_TIMEZONE = "Asia/Manila";

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  }
});
