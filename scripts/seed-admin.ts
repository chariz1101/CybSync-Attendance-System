/**
 * Creates a council/admin account, or resets the password of an existing one.
 *
 *   npm run seed:admin
 *   npm run seed:admin -- --username cictsc --name "CICT Student Council" --role council
 *
 * Reads MONGODB_URI from .env.local (or the environment). The password is
 * always typed in (hidden), or read from SEED_PASSWORD for non-interactive use.
 */
import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

const ROLES = ["council", "admin"] as const;
const MIN_PASSWORD_LENGTH = 8;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    args[key.slice(2)] = value;
    i++;
  }
  return args;
}

const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });

// Queue input lines so answers piped in ahead of time aren't lost.
const pendingLines: string[] = [];
const waiting: ((line: string | null) => void)[] = [];
let inputClosed = false;
rl.on("line", (line) => {
  const next = waiting.shift();
  if (next) next(line);
  else pendingLines.push(line);
});
rl.on("close", () => {
  inputClosed = true;
  for (const next of waiting.splice(0)) next(null);
});

// Hides typed characters while reading a password in a terminal.
const rlOutput = rl as unknown as { _writeToOutput: (s: string) => void };
const echo = rlOutput._writeToOutput.bind(rl);

async function prompt(question: string, { hidden = false } = {}) {
  stdout.write(question);
  if (hidden && stdin.isTTY) rlOutput._writeToOutput = () => {};
  const line = pendingLines.length
    ? pendingLines.shift()!
    : inputClosed
      ? null
      : await new Promise<string | null>((resolve) => waiting.push(resolve));
  rlOutput._writeToOutput = echo;
  if (hidden || !stdin.isTTY) stdout.write("\n");
  if (line === null) throw new Error("No input received.");
  return line;
}

async function ask(question: string, fallback?: string) {
  const answer = (await prompt(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim();
  return answer || fallback || "";
}

function askHidden(question: string) {
  return prompt(question, { hidden: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local or pass it in the environment.");
  }

  const username = (args.username ?? (await ask("Username"))).trim();
  if (!username) throw new Error("Username is required.");

  // Imported after loadEnvConfig so the app modules see the env vars.
  const { connectDB } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/lib/auth");
  const { User } = await import("../src/models/User");

  await connectDB();
  const existing = await User.findOne({ username });

  if (existing) {
    console.log(`An account named "${username}" already exists (${existing.name}, ${existing.role}).`);
    const confirm = await ask("Reset its password? (yes/no)", "no");
    if (confirm.toLowerCase() !== "yes") {
      console.log("Nothing changed.");
      return;
    }
  }

  const name = existing
    ? existing.name
    : (args.name ?? (await ask("Display name", "CICT Student Council"))).trim();
  const role = existing ? existing.role : (args.role ?? (await ask("Role (council/admin)", "admin"))).trim();
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error(`Role must be one of: ${ROLES.join(", ")}`);

  let password = process.env.SEED_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Password: ");
    const again = await askHidden("Confirm password: ");
    if (password !== again) throw new Error("Passwords don't match.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`✅ Password reset for "${username}".`);
  } else {
    await User.create({ username, name, role, passwordHash });
    console.log(`✅ Created ${role} account "${username}" (${name}).`);
  }
}

main()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await mongoose.disconnect();
  });
