/** The logged-in user, as verified and set by the proxy. Staff routes use requireStaff() in lib/staff.ts. */
export function currentUser(req: Request) {
  return { id: req.headers.get("x-user-id") ?? "", role: req.headers.get("x-user-role") ?? "" };
}

export function isDuplicateKeyError(err: unknown) {
  return (err as { code?: number })?.code === 11000;
}
