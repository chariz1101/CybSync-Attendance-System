/**
 * One-time database upgrades. Safe to run more than once.
 *
 *   npm run db:migrate
 *
 * Reads MONGODB_URI from .env.local (or the environment), like seed:admin.
 */
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local or pass it in the environment.");
  }
  const { connectDB } = await import("../src/lib/db");
  const { Student } = await import("../src/models/Student");
  await connectDB();

  // 1. Blank card numbers would clash under the new unique RFID index. Remove them.
  const blank = await Student.updateMany({ rfid: { $in: ["", null], $exists: true } }, { $unset: { rfid: 1 } });
  console.log(`• Cleared ${blank.modifiedCount} blank RFID value(s).`);

  // 2. Emails are now stored lowercase (student login compares them that way).
  const lower = await Student.updateMany({ email: { $regex: /[A-Z\s]/ } }, [
    { $set: { email: { $toLower: { $trim: { input: "$email" } } } } },
  ], { updatePipeline: true });
  console.log(`• Lowercased ${lower.modifiedCount} email(s).`);

  // 3. Stop if two students share a card, since the unique index can't be built.
  const dupes = await Student.aggregate([
    { $match: { rfid: { $exists: true } } },
    { $group: { _id: "$rfid", students: { $push: "$studentId" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (dupes.length) {
    for (const d of dupes) console.log(`  Card ${d._id} is linked to: ${d.students.join(", ")}`);
    throw new Error("Some RFID cards are linked to more than one student. Unlink the extras on the Students page, then run this again.");
  }

  // 4. Replace old indexes with the ones the Student model defines (e.g. unique RFID).
  const dropped = await Student.syncIndexes();
  console.log(`• Student indexes are up to date${dropped.length ? ` (replaced: ${dropped.join(", ")})` : ""}.`);
  console.log("✅ Done.");
}

main()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
