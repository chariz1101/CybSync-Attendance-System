import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { POST as councilLogin } from "@/app/api/auth/council-login/route";
import { POST as studentLogin } from "@/app/api/auth/student-login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { json, makeStudent, makeUser, req } from "../helpers";

const login = (username: string, password: string, ip = "10.0.0.1", rememberMe = false) =>
  councilLogin(req("/api/auth/council-login", { json: { username, password, rememberMe }, headers: { "x-forwarded-for": ip } }));

const sessionFrom = (res: Response) => /cybsync_session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1];

describe("council login", () => {
  beforeAll(async () => {
    await makeUser("alice", "council", "correct-pass");
    await makeUser("bob", "admin", "bob-pass-123");
  });

  it("sets an HttpOnly session cookie and doesn't return the token", async () => {
    const res = await login("alice", "correct-pass");
    const { status, body } = await json(res);
    expect(status).toBe(200);
    expect(body.user.role).toBe("council");
    expect(body.token).toBeUndefined();
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).not.toMatch(/Max-Age/i); // session cookie without "Remember me"
    expect(jwt.verify(sessionFrom(res)!, "test-secret")).toMatchObject({ role: "council" });
  });

  it("keeps the session for 30 days with Remember me", async () => {
    const res = await login("bob", "bob-pass-123", "10.0.0.2", true);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=2592000/);
  });

  it("gives the same error for a wrong password and an unknown user", async () => {
    expect((await json(await login("alice", "nope", "10.0.0.3"))).body.message).toBe("Incorrect username or password.");
    expect((await json(await login("ghost", "nope", "10.0.0.3"))).body.message).toBe("Incorrect username or password.");
  });

  it("locks an account after 5 failures, even with the right password, from any IP", async () => {
    await makeUser("carol", "council", "carol-pass-1");
    for (let i = 0; i < 5; i++) expect((await login("carol", "wrong", "10.1.0.1")).status).toBe(401);
    const blocked = await login("carol", "carol-pass-1", "10.1.0.2");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("blocks an IP after 20 failures across accounts", async () => {
    for (let i = 0; i < 20; i++) await login(`nobody${i}`, "x", "10.2.0.1");
    expect((await login("bob", "bob-pass-123", "10.2.0.1")).status).toBe(429);
    expect((await login("bob", "bob-pass-123", "10.2.0.2")).status).toBe(200);
  });

  it("resets an account's counter after a successful login", async () => {
    await makeUser("dave", "council", "dave-pass-1");
    for (let i = 0; i < 4; i++) await login("dave", "wrong", "10.3.0.1");
    expect((await login("dave", "dave-pass-1", "10.3.0.1")).status).toBe(200);
    for (let i = 0; i < 4; i++) await login("dave", "wrong", "10.3.0.1");
    expect((await login("dave", "dave-pass-1", "10.3.0.1")).status).toBe(200);
  });
});

describe("student login (Google + Student ID)", () => {
  // Google's token check is replaced; everything else runs as written.
  const google = (payload: Record<string, unknown> | Error) =>
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation((async () => {
      if (payload instanceof Error) throw payload;
      return { getPayload: () => payload };
    }) as never);
  const school = { email: "juan.cruz@school.edu.ph", email_verified: true, hd: "school.edu.ph" };
  const studentLoginAs = (studentId: string, ip = "10.9.0.1") =>
    studentLogin(req("/api/auth/student-login", { json: { studentId, credential: "google-token" }, headers: { "x-forwarded-for": ip } }));

  afterEach(() => vi.restoreAllMocks());

  it("logs in when the Student ID matches the Google account", async () => {
    await makeStudent({ studentId: "2023M1025", email: "Juan.Cruz@school.edu.ph" });
    google(school);
    const res = await studentLoginAs(" 2023M1025 ");
    expect(res.status).toBe(200);
    expect(jwt.verify(sessionFrom(res)!, "test-secret")).toMatchObject({ role: "student" });
  });

  it("checks the token was issued for this app", async () => {
    const spy = google(school);
    await studentLoginAs("2023M1025");
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ audience: "test-client.apps.googleusercontent.com" }));
  });

  it("rejects someone else's ID, unknown IDs, other domains and bad tokens", async () => {
    await makeStudent({ studentId: "2023M2000", email: "maria@school.edu.ph" });
    google(school);
    expect((await json(await studentLoginAs("2023M2000", "10.9.1.1"))).body.message).toBe("That Student ID doesn't match your Google account.");
    expect((await json(await studentLoginAs("9999", "10.9.1.2"))).body.message).toBe("That Student ID doesn't match your Google account.");
    vi.restoreAllMocks();
    google({ email: "juan@gmail.com", email_verified: true });
    expect((await studentLoginAs("2023M1025", "10.9.1.3")).status).toBe(403);
    vi.restoreAllMocks();
    google({ ...school, email_verified: false });
    expect((await studentLoginAs("2023M1025", "10.9.1.4")).status).toBe(401);
    vi.restoreAllMocks();
    google(new Error("bad signature"));
    expect((await studentLoginAs("2023M1025", "10.9.1.5")).status).toBe(401);
  });

  it("rejects inactive students", async () => {
    await makeStudent({ studentId: "2023M3000", email: "sus@school.edu.ph", status: "suspended" });
    google({ email: "sus@school.edu.ph", email_verified: true, hd: "school.edu.ph" });
    expect((await studentLoginAs("2023M3000", "10.9.2.1")).status).toBe(403);
  });
});

describe("/api/auth/me", () => {
  it("returns the logged-in student", async () => {
    const { as } = await makeStudent({ name: "Ana Lim" });
    const { body } = await json(await me(req("/api/auth/me", { as })));
    expect(body).toMatchObject({ role: "student", name: "Ana Lim" });
  });
});
