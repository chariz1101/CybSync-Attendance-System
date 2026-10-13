import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as listEvents, POST as createEvent } from "@/app/api/events/route";
import { DELETE as deleteEvent, PATCH as patchEvent } from "@/app/api/events/[eventId]/route";
import { POST as requestEvent } from "@/app/api/events/request/route";
import { GET as listRequests } from "@/app/api/events/requests/route";
import { POST as reviewRequest } from "@/app/api/events/requests/[requestId]/route";
import { POST as scan } from "@/app/api/attendance/scan/route";
import { GET as records } from "@/app/api/attendance/records/route";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { GET as pastEvents } from "@/app/api/events/past/route";
import { json, makeEvent, makeStudent, makeUser, params, req } from "../helpers";

let admin: Awaited<ReturnType<typeof makeUser>>;
let council: Awaited<ReturnType<typeof makeUser>>;

beforeAll(async () => {
  admin = await makeUser("admin1", "admin");
  council = await makeUser("council1", "council");
});

// Events run by the council1 organization.
const ownEvent = (fields: Record<string, unknown> = {}) => makeEvent({ owner: { userId: council.id, name: "council1 name" }, ...fields });

// Only Date is faked, so MongoDB's own timers keep working.
const atManila = (time: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`2026-10-13T${time}:00+08:00`));
};
afterEach(() => vi.useRealTimers());

describe("events and requests", () => {
  it("only admins create, edit and delete events", async () => {
    const body = { name: "Org Fair", date: "2026-11-05", startTime: "08:00" };
    expect((await createEvent(req("/api/events", { json: body, as: council }))).status).toBe(403);
    const { status, body: created } = await json(await createEvent(req("/api/events", { json: body, as: admin })));
    expect(status).toBe(201);
    expect(created.event).toMatchObject({ status: "upcoming", graceMinutes: 15 });

    const id = created.event.id;
    expect((await patchEvent(req(`/api/events/${id}`, { method: "PATCH", json: { ...body, name: "X" }, as: council }), params({ eventId: id }))).status).toBe(403);
    expect((await deleteEvent(req(`/api/events/${id}`, { method: "DELETE", as: council }), params({ eventId: id }))).status).toBe(403);
    expect((await deleteEvent(req(`/api/events/${id}`, { method: "DELETE", as: admin }), params({ eventId: id }))).status).toBe(200);
  });

  it("rejects an end before the start", async () => {
    const res = await createEvent(req("/api/events", { json: { name: "Bad", date: "2026-11-05", startTime: "09:00", endDate: "2026-11-04" }, as: admin }));
    expect(res.status).toBe(400);
  });

  it("turns an approved request into an event, once", async () => {
    const { body: submitted } = await json(
      await requestEvent(req("/api/events/request", { json: { eventTitle: "Hackathon", dateStart: "2026-11-28", timeStart: "08:00", location: "Lab 3" }, as: council }))
    );
    const id = submitted.requestId;
    const { body: list } = await json(await listRequests(req("", { as: council })));
    expect(list.requests.find((r: any) => r.id === id)).toMatchObject({ status: "pending", requestedBy: "council1 name" });

    expect((await reviewRequest(req("", { json: { action: "approve" }, as: council }), params({ requestId: id }))).status).toBe(403);
    const { status, body } = await json(await reviewRequest(req("", { json: { action: "approve", notes: "OK" }, as: admin }), params({ requestId: id })));
    expect(status).toBe(200);
    expect(body.event).toMatchObject({ name: "Hackathon", status: "upcoming", location: "Lab 3" });
    expect(body.request).toMatchObject({ status: "approved", reviewedBy: "admin1 name" });
    expect((await reviewRequest(req("", { json: { action: "reject" }, as: admin }), params({ requestId: id }))).status).toBe(409);
  });

  it("only allows upcoming → active → past (→ active again)", async () => {
    const event = await ownEvent({ status: "upcoming" });
    const set = (status: string) => patchEvent(req("", { method: "PATCH", json: { status }, as: council }), params({ eventId: event.id }));
    expect((await set("past")).status).toBe(400);
    expect((await json(await set("active"))).body.event.startedAt).toBeTruthy();
    expect((await set("past")).status).toBe(200);
    expect((await set("active")).status).toBe(200);
  });

  it("can't delete an event that has attendance", async () => {
    const event = await ownEvent();
    const { student } = await makeStudent({ rfid: "CARD-DEL" });
    await scan(req("", { json: { rfid: student.rfid, eventId: event.id }, as: council }));
    expect((await deleteEvent(req("", { method: "DELETE", as: admin }), params({ eventId: event.id }))).status).toBe(409);
  });

  it("lists events by status", async () => {
    const { body } = await json(await listEvents(req("/api/events?status=upcoming", { as: admin })));
    expect(body.events.every((e: any) => e.status === "upcoming")).toBe(true);
  });
});

describe("scanning", () => {
  const scanAs = (rfid: string, eventId: string, type = "AM", action = "Sign In") =>
    scan(req("/api/attendance/scan", { json: { rfid, eventId, type, action }, as: council }));

  it("records by card or Student ID and refuses duplicates", async () => {
    const event = await ownEvent();
    const { student } = await makeStudent({ rfid: "CARD-1", name: "Juan" });
    atManila("06:55");
    const first = await json(await scanAs(" CARD-1 ", event.id));
    expect(first.status).toBe(200);
    expect(first.body.record).toMatchObject({ name: "Juan", type: "AM", action: "Sign In", status: "on-time" });
    expect((await scanAs(student.studentId, event.id)).status).toBe(409);
    expect((await scanAs("CARD-1", event.id, "AM", "Sign Out")).status).toBe(200);
  });

  it("marks sign-ins after start + grace as late (school time)", async () => {
    const event = await ownEvent({ startTime: "07:00", pmStartTime: "13:00", graceMinutes: 10 });
    const a = await makeStudent({ rfid: "LATE-A" });
    const b = await makeStudent({ rfid: "LATE-B" });
    atManila("07:10");
    expect((await json(await scanAs("LATE-A", event.id))).body.record.status).toBe("on-time");
    atManila("07:11");
    expect((await json(await scanAs("LATE-B", event.id))).body.record.status).toBe("late");
    atManila("13:30");
    expect((await json(await scanAs("LATE-A", event.id, "PM"))).body.record.status).toBe("late");
    expect((await json(await scanAs("LATE-B", event.id, "PM", "Sign Out"))).body.record.status).toBe("on-time");
    expect(a.student.id).not.toBe(b.student.id);
  });

  it("explains every refusal", async () => {
    const running = await ownEvent();
    const upcoming = await ownEvent({ status: "upcoming" });
    await makeStudent({ rfid: "CARD-INACTIVE", status: "inactive" });
    await makeStudent({ rfid: "CARD-OK" });
    expect((await scanAs("NOPE", running.id)).status).toBe(404);
    expect((await scanAs("CARD-INACTIVE", running.id)).status).toBe(403);
    expect((await scanAs("CARD-OK", upcoming.id)).status).toBe(400);
    expect((await scanAs("CARD-OK", running.id, "EVENING")).status).toBe(400);
    expect((await scanAs("CARD-OK", "not-an-id")).status).toBe(404);
  });
});

describe("statistics", () => {
  it("counts attended students per event, by course and year", async () => {
    const event = await ownEvent({ name: "Stats Day" });
    const cs3 = await makeStudent({ course: "BSCS", year: "3", rfid: "S1" });
    const it2 = await makeStudent({ course: "BSIT", year: "2", rfid: "S2" });
    await makeStudent({ course: "BSIS", year: "4" }); // didn't come
    atManila("06:30");
    for (const s of [cs3, it2]) await scan(req("", { json: { rfid: s.student.rfid, eventId: event.id }, as: council }));
    await scan(req("", { json: { rfid: "S1", eventId: event.id, action: "Sign Out" }, as: council })); // a second scan isn't a second person

    const { body } = await json(await records(req(`/api/attendance/records?eventId=${event.id}`, { as: council })));
    expect(body.records).toHaveLength(3);
    expect(body.stats.totalStudentsAttended).toBe(2);
    expect(body.stats.attendanceRate).toBe(Math.round((2 / body.stats.totalDepartmentStudents) * 100));
    expect(body.courseDistribution.map((c: any) => [c.course, c.value])).toEqual([["BSCS", 1], ["BSIT", 1]]);
    expect(body.yearCourseDistribution.map((y: any) => y.year)).toEqual(["2nd", "3rd"]);

    expect((await records(req("/api/attendance/records?eventId=bad", { as: council }))).status).toBe(400);
  });

  it("shows the running event on the dashboard, and ended events in Past Events", async () => {
    const { body } = await json(await dashboard(req("", { as: council })));
    expect(body.event.status).toBe("active");
    expect(body.stats).toBeTruthy();

    const ended = await ownEvent({ name: "Ended One", status: "past", date: "2026-10-01" });
    const { body: past } = await json(await pastEvents(req("", { as: council })));
    expect(past.events.find((e: any) => e.id === ended.id)).toMatchObject({ name: "Ended One", stats: { totalStudentsAttended: 0 } });
  });
});
