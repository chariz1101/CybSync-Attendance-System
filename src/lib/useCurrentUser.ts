import { useEffect, useState } from "react";

export type CurrentUser = {
  role: "council" | "admin" | "student";
  name: string;
  username?: string;
  studentId?: string;
  course?: string;
  year?: string;
  section?: string;
  email?: string;
};

/**
 * Loads the logged-in user from /api/auth/me. If the session has expired,
 * sends the user to `loginPath`.
 */
export function useCurrentUser(loginPath: string) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = loginPath;
          return;
        }
        if (res.ok && !cancelled) setUser(await res.json());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loginPath]);

  return user;
}

/** Ends the session and returns to the login page. */
export async function signOut(loginPath: string) {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.location.href = loginPath;
}
