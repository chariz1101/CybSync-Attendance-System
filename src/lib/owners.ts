import { isValidObjectId } from "mongoose";
import { User } from "@/models/User";

/**
 * Resolves the admin's "run by" choice for an event: an active organization
 * account's { userId, name }, null for "admin runs it" (empty), or an error message.
 */
export async function resolveOwner(ownerId: string | undefined): Promise<{ owner: { userId: string; name: string } | null } | { error: string }> {
  if (!ownerId) return { owner: null };
  const org = isValidObjectId(ownerId) ? await User.findById(ownerId) : null;
  if (!org || org.role !== "council" || org.status === "disabled") return { error: "Choose an active organization account." };
  return { owner: { userId: org.id, name: org.name } };
}
