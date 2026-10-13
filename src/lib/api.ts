import { signOut } from '@/lib/useCurrentUser';

/** fetch + JSON with a readable error message. Throws on non-2xx responses. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    ...(json !== undefined ? { body: JSON.stringify(json), headers: { 'Content-Type': 'application/json', ...rest.headers } } : {}),
  });
  if (res.status === 401) {
    // Session expired, or the account was disabled: end it and go to the right login page.
    await signOut(window.location.pathname.startsWith('/student') ? '/student-login' : '/');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data as T;
}
