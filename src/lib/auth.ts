import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(payload: Record<string, unknown>, expiresIn = process.env.TOKEN_EXPIRY || "1d") {
  return jwt.sign(payload, getSecret(), { expiresIn: expiresIn as SignOptions["expiresIn"] });
}

export function verifyToken<T = unknown>(token: string): T {
  return jwt.verify(token, getSecret()) as T;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
