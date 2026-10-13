import { beforeAll, describe, expect, it } from "vitest";
import { GET as studentReports, POST as sendReport } from "@/app/api/student/reports/route";
import { GET as allReports } from "@/app/api/reports/route";
import { POST as accept } from "@/app/api/reports/[reportId]/accept/route";
import { POST as reject } from "@/app/api/reports/[reportId]/reject/route";
import { GET as attachment } from "@/app/api/reports/attachments/[attachmentId]/route";
import { GET as studentAttendance } from "@/app/api/student/attendance/route";
import { GET as studentDashboard } from "@/app/api/student/dashboard/route";
import { Attendance } from "@/models/Attendance";
import { json, makeEvent, makeStudent, makeUser, params, req } from "../helpers";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.4 test");

function form(fields: Record<string, string>, files: [string, Uint8Array, string][] = []) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  files.forEach(([name, bytes, type]) => f.append("files", new File([bytes.slice()], name, { type })));
  return f;
}

let council: Awaited<ReturnType<typeof makeUser>>;
let event: Awaited<ReturnType<typeof makeEvent>>;
beforeAll(async () => {
  council = await makeUser("council-reports", "council");
  event = await makeEvent({ name: "University Days", status: "past" });
});

describe("student reports", () => {
  it("lists only events that have started", async () => {
    await makeEvent({ name: "Not Yet", status: "upcoming" });
    const { as } = await makeStudent();
    const { body } = await json(await studentReports(req("/api/student/reports", { as })));
    expect(body.events.map((e: any) => e.name)).toEqual(["University Days"]);
  });

  it("validates attachments by content and size", async () => {
    const { as } = await makeStudent();
    const send = (files: [string, Uint8Array, string][], extra: Record<string, string> = {}) =>
      sendReport(req("/api/student/reports", { body: form({ type: "excuse", eventId: event.id, message: "Sick", ...extra }, files), as }));

    expect((await send([["fake.png", new TextEncoder().encode("<html><script>"), "image/png"]])).status).toBe(400);
    expect((await send([1, 2, 3, 4].map((i) => [`${i}.png`, PNG, "image/png"] as [string, Uint8Array, string]))).status).toBe(400);
    const big = new Uint8Array(2 * 1024 * 1024 + 10);
    big.set(PDF);
    expect((await send([["big.pdf", big, "application/pdf"]])).status).toBe(413);
    expect((await send([], { message: "  " })).status).toBe(400);
    expect((await send([], { type: "complaint" })).status).toBe(400);
  });

  it("accepting an excuse marks an absent student excused", async () => {
    const { student, as } = await makeStudent({ name: "Maria Reyes" });
    const sent = await json(await sendReport(req("", { body: form({ type: "excuse", eventId: event.id, message: "Medical certificate attached" }, [["cert.png", PNG, "image/png"]]), as })));
    expect(sent.status).toBe(201);
    const [file] = sent.body.report.attachments;

    // Council sees it and can open the file; it's served exactly, with nosniff
    const { body } = await json(await allReports());
    expect(body.pendingReports.find((r: any) => r.id === sent.body.report.id).student.name).toBe("Maria Reyes");
    const download = await attachment(req(""), params({ attachmentId: file.id }));
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(PNG);
    expect(download.headers.get("content-type")).toBe("image/png");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");

    const res = await json(await accept(req("", { json: { response: "Get well soon" }, as: council }), params({ reportId: sent.body.report.id })));
    expect(res.body.excusedRecords).toBe(1);
    expect((await accept(req("", { json: {}, as: council }), params({ reportId: sent.body.report.id }))).status).toBe(409);
    expect(await Attendance.findOne({ student: student._id, event: event._id })).toMatchObject({ status: "excused", action: "Excused" });
  });

  it("accepting an excuse turns late scans into excused but leaves on-time ones", async () => {
    const { student, as } = await makeStudent();
    await Attendance.create([
      { student: student._id, event: event._id, type: "AM", action: "Sign In", status: "late" },
      { student: student._id, event: event._id, type: "AM", action: "Sign Out", status: "on-time" },
    ]);
    const sent = await json(await sendReport(req("", { body: form({ type: "excuse", eventId: event.id, message: "Jeepney broke down" }, [["letter.pdf", PDF, "application/pdf"]]), as })));
    await accept(req("", { json: {}, as: council }), params({ reportId: sent.body.report.id }));
    const statuses = (await Attendance.find({ student: student._id })).map((a) => a.status).sort();
    expect(statuses).toEqual(["excused", "on-time"]);

    const { body } = await json(await studentAttendance(req("", { as })));
    expect(body.stats).toMatchObject({ totalEvents: 1, excused: 1, onTimeAttendance: 1 });
    expect((await json(await studentDashboard(req("", { as })))).body.attendanceHistory).toHaveLength(2);
  });

  it("shows the rejection reason to the student", async () => {
    const { as } = await makeStudent();
    const sent = await json(await sendReport(req("", { body: form({ type: "discrepancy", eventId: event.id, message: "My PM sign-in is missing" }), as })));
    await reject(req("", { json: { reason: "You were not scanned in the PM." }, as: council }), params({ reportId: sent.body.report.id }));
    const { body } = await json(await studentReports(req("", { as })));
    expect(body.reports[0]).toMatchObject({ status: "rejected", response: "You were not scanned in the PM.", type: "discrepancy" });
  });
});
