import { OAuth2Client } from "google-auth-library";

export class GoogleAuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

const client = new OAuth2Client();

function getConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
  if (!allowedDomain) throw new Error("ALLOWED_EMAIL_DOMAIN is not set");
  return { clientId, allowedDomain };
}

/**
 * Verifies a Google Sign-In ID token and returns the signed-in school email.
 * Rejects tokens issued for another app, unverified emails, and accounts
 * outside the school's Google Workspace domain.
 */
export async function verifyGoogleSchoolAccount(credential: string) {
  const { clientId, allowedDomain } = getConfig();

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new GoogleAuthError("Google sign-in failed. Please try again.", 401);
  }

  const email = payload?.email?.toLowerCase();
  if (!email || !payload?.email_verified) {
    throw new GoogleAuthError("Google sign-in failed. Please try again.", 401);
  }
  if (payload.hd?.toLowerCase() !== allowedDomain || !email.endsWith(`@${allowedDomain}`)) {
    throw new GoogleAuthError("Please sign in with your school Google account.", 403);
  }

  return { email };
}
