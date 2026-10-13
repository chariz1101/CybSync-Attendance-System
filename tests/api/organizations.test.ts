import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listEvents, POST as createEvent } from "@/app/api/events/route";
import { PATCH as patchEvent } from "@/app/api/events/[eventId]/route";
import { POST as requestEvent } from "@/app/api/events/request/route";
import { GET as listRequests } from "@/app/api/events/requests/route";
import { POST as reviewRequest } from "@/app/api/events/requests/[requestId]/route";
import { POST as scan } from "@/app/api/attendance/scan/route";
import { GET as records } from "@/app/api/attendance/records/route";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { GET as allReports } from "@/app/api/reports/route";
import { POST as accept } from "@/app/api/reports/[reportId]/accept/route";
import { GET as attachment } from "@/app/api/reports/attachments/[attachmentId]/route";
import { POST as sendReport } from "@/app/api/student/reports/route";
import { GET as listAccounts, POST as createAccount } from "@/app/api/accounts/route";
import { PATCH as updateAccount } from "@/app/api/accounts/[accountId]/route";
import { POST as councilLogin } from "@/app/api/auth/council-login/route";
import { GET as listStudents } from "@/app/api/students/route";
import { proxy } from "@/proxy";
import { signToken } from "@/lib/auth";
import { json, makeStudent, makeUser, params, req } from "../helpers";

let admin: Awaited<ReturnType<typeof makeUser>>;
let orgA: Awaited<ReturnType<typeof makeUser>>;
let orgB: Awaited<ReturnType<typeof makeUser>>;
let eventA: string; // approved request from org A

beforeAll(async () => {
  admin = await makeUser("root", "admin");
  orgA = await makeUser("org-a", "council");
  orgB = await makeUser("org-b", "council");
});

const start = (as: typeof admin, eventId: string) =>
  patchEvent(req("", { method: "PATCH", json: { status: "active" }, as }), params({ eventId }));

describe("requests: organizations ask, the admin decides", () => {
  it("each organization sees only its own requests; the admin sees all", async () => {
    const a = await json(await requestEvent(req("", { json: { eventTitle: "A Fair", dateStart: "2026-11-01", timeStart: "08:00" }, as: orgA })));
    await requestEvent(req("", { json: { eventTitle: "B Night", dateStart: "2026-11-02" }, as: orgB }));
    const titles = async (as: typeof admin) => (await json(await listRequests(req("", { as })))).body.requests.map((r: any) => r.eventTitle).sort();
    expect(await titles(orgA)).toEqual(["A Fair"]);
    expect(await titles(orgB)).toEqual(["B Night"]);
    expect(await titles(admin)).toEqual(["A Fair", "B Night"]);

    expect((await reviewRequest(req("", { json: { action: "approve" }, as: orgB }), params({ requestId: a.body.requestId }))).status).toBe(403);
    const approved = await json(await reviewRequest(req("", { json: { action: "approve" }, as: admin }), params({ requestId: a.body.requestId })));
    expect(approved.body.event).toMatchObject({ ownerId: orgA.id, ownerName: "org-a name" });
    eventA = approved.body.event.id;
  });

  it("admins create events directly instead of requesting them", async () => {
    expect((await requestEvent(req("", { json: { eventTitle: "X", dateStart: "2026-11-03" }, as: admin }))).status).toBe(400);
  });
});

describe("an organization only sees and runs its own events", () => {
  it("lists only its own events", async () => {
    const ids = async (as: typeof admin) => (await json(await listEvents(req("/api/events", { as })))).body.events.map((e: any) => e.id);
    expect(await ids(orgA)).toContain(eventA);
    expect(await ids(orgB)).not.toContain(eventA);
    expect(await ids(admin)).toContain(eventA);
  });

  it("can't start, scan or read another organization's event", async () => {
    await makeStudent({ rfid: "ORG-CARD" });
    expect((await start(orgB, eventA)).status).toBe(403);
    expect((await start(orgA, eventA)).status).toBe(200);
    expect((await scan(req("", { json: { rfid: "ORG-CARD", eventId: eventA }, as: orgB }))).status).toBe(403);
    expect((await scan(req("", { json: { rfid: "ORG-CARD", eventId: eventA }, as: orgA }))).status).toBe(200);
    expect((await records(req(`/api/attendance/records?eventId=${eventA}`, { as: orgB }))).status).toBe(403);
    expect((await records(req(`/api/attendance/records?eventId=${eventA}`, { as: admin }))).status).toBe(200);
  });

  it("sees only its own event on the dashboard", async () => {
    expect((await json(await dashboard(req("", { as: orgA })))).body.event.id).toBe(eventA);
    expect((await json(await dashboard(req("", { as: orgB })))).body.event).toBeNull();
    expect((await json(await dashboard(req("", { as: admin })))).body.pendingRequests).toBe(1); // B's request
  });

  it("reviews only reports about its own events", async () => {
    const { as: student } = await makeStudent();
    const form = new FormData();
    form.set("type", "excuse");
    form.set("eventId", eventA);
    form.set("message", "Sick");
    form.append("files", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "note.pdf"));
    const sent = await json(await sendReport(req("", { body: form, as: student })));
    const reportId = sent.body.report.id;
    const fileId = sent.body.report.attachments[0].id;

    const pendingFor = async (as: typeof admin) => (await json(await allReports(req("", { as })))).body.pendingReports.map((r: any) => r.id);
    expect(await pendingFor(orgA)).toEqual([reportId]);
    expect(await pendingFor(orgB)).toEqual([]);
    expect(await pendingFor(admin)).toEqual([reportId]);
    expect((await attachment(req("", { as: orgB }), params({ attachmentId: fileId }))).status).toBe(404);
    expect((await accept(req("", { json: {}, as: orgB }), params({ reportId }))).status).toBe(403);
    expect((await accept(req("", { json: {}, as: orgA }), params({ reportId }))).status).toBe(200);
  });

  it("shares the student list with every organization", async () => {
    expect((await listStudents(req("/api/students", { as: orgB }))).status).toBe(200);
  });
});

describe("the admin assigns events", () => {
  it("creates an event run by an organization, and can reassign it", async () => {
    const created = await json(
      await createEvent(req("/api/events", { json: { name: "Assembly", date: "2026-11-10", ownerId: orgB.id }, as: admin }))
    );
    expect(created.body.event.ownerName).toBe("org-b name");
    expect((await start(orgB, created.body.event.id)).status).toBe(200);

    const moved = await json(
      await patchEvent(
        req("", { method: "PATCH", json: { name: "Assembly", date: "2026-11-10", ownerId: orgA.id }, as: admin }),
        params({ eventId: created.body.event.id })
      )
    );
    expect(moved.body.event.ownerId).toBe(orgA.id);
    expect((await start(orgB, created.body.event.id)).status).toBe(403);
  });

  it("only assigns events to active organization accounts", async () => {
    const make = (ownerId: string) => createEvent(req("/api/events", { json: { name: "X", date: "2026-11-11", ownerId }, as: admin }));
    expect((await make(admin.id)).status).toBe(400);
    expect((await make("not-an-id")).status).toBe(400);
    expect((await json(await make(""))).body.event.ownerId).toBeNull(); // admin-run
  });
});

describe("accounts", () => {
  const create = (as: typeof admin, body: object) => createAccount(req("/api/accounts", { json: body, as }));
  const update = (as: typeof admin, id: string, body: object) => updateAccount(req("", { method: "PATCH", json: body, as }), params({ accountId: id }));
  const login = (username: string, password: string) =>
    councilLogin(req("/api/auth/council-login", { json: { username, password }, headers: { "x-forwarded-for": `10.50.${Math.floor(Math.random() * 250)}.1` } }));

  it("only the admin can list or create accounts", async () => {
    expect((await listAccounts(req("", { as: orgA }))).status).toBe(403);
    expect((await create(orgA, { name: "Hack", username: "hack", password: "password-123" })).status).toBe(403);
  });

  it("creates an organization account that can log in", async () => {
    const res = await json(await create(admin, { name: "Robotics Club", username: "  Robotics ", password: "robot-pass-1" }));
    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({ username: "robotics", role: "council", status: "active" });
    expect((await login("robotics", "robot-pass-1")).status).toBe(200);

    expect((await create(admin, { name: "Dup", username: "robotics", password: "password-123" })).status).toBe(409);
    expect((await create(admin, { name: "Short", username: "short", password: "1234" })).status).toBe(400);
    expect((await create(admin, { name: "Bad", username: "has spaces", password: "password-123" })).status).toBe(400);

    const list = (await json(await listAccounts(req("", { as: admin })))).body.accounts;
    expect(list.find((a: any) => a.username === "org-a")).toMatchObject({ events: 2, role: "council" });
  });

  it("renames an organization everywhere", async () => {
    await update(admin, orgA.id, { name: "Org A Council" });
    const events = (await json(await listEvents(req("/api/events", { as: orgA })))).body.events;
    expect(events.every((e: any) => e.ownerName === "Org A Council")).toBe(true);
  });

  it("resets a password", async () => {
    const acct = (await json(await create(admin, { name: "Chess", username: "chess", password: "old-pass-123" }))).body.account;
    await update(admin, acct.id, { password: "new-pass-456" });
    expect((await login("chess", "old-pass-123")).status).toBe(401);
    expect((await login("chess", "new-pass-456")).status).toBe(200);
  });

  it("a disabled account is locked out at once, even with a valid session", async () => {
    const acct = (await json(await create(admin, { name: "Drama", username: "drama", password: "drama-pass-1" }))).body.account;
    const drama = { id: acct.id, role: "council" as const };
    expect((await listEvents(req("/api/events", { as: drama }))).status).toBe(200);

    await update(admin, acct.id, { status: "disabled" });
    expect((await listEvents(req("/api/events", { as: drama }))).status).toBe(401);
    const blocked = await json(await login("drama", "drama-pass-1"));
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toContain("disabled");

    await update(admin, acct.id, { status: "active" });
    expect((await login("drama", "drama-pass-1")).status).toBe(200);
  });

  it("the admin can't disable or demote themselves", async () => {
    expect((await update(admin, admin.id, { status: "disabled" })).status).toBe(400);
    expect((await update(admin, admin.id, { role: "council" })).status).toBe(400);
  });

  it("the Accounts page is admin-only", () => {
    const visit = (role: string) =>
      proxy(new NextRequest("http://localhost/dashboard/accounts", { headers: { cookie: `cybsync_session=${signToken({ sub: "x", role })}` } }));
    expect(new URL(visit("council").headers.get("location")!).pathname).toBe("/dashboard");
    expect(visit("admin").headers.get("location")).toBeNull();
  });
});
