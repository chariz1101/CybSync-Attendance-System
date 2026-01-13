import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set");

export function signToken(payload: Record<string, unknown>, expiresIn = process.env.TOKEN_EXPIRY || "1d") {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, secret) as T;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}