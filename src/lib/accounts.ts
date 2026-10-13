import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

const password = z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`).max(200);

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "Username: 3–40 letters, numbers, dots, dashes or underscores"),
  password,
  role: z.enum(["council", "admin"]).default("council"),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  password: password.optional(),
  status: z.enum(["active", "disabled"]).optional(),
  role: z.enum(["council", "admin"]).optional(),
});

export function toAccountJson(u: { id: string; username: string; name: string; role: string; status?: string; createdAt?: Date }) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role as "admin" | "council",
    status: (u.status ?? "active") as "active" | "disabled",
    createdAt: u.createdAt?.toISOString() ?? null,
  };
}
