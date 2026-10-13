import { beforeAll, describe, expect, it } from "vitest";
import { GET as listStudents, POST as addStudent } from "@/app/api/students/route";
import { PATCH as editStudent } from "@/app/api/students/[studentId]/route";
import { POST as importCsv } from "@/app/api/students/import/route";
import { json, makeUser, params, req } from "../helpers";

let council: Awaited<ReturnType<typeof makeUser>>;
beforeAll(async () => {
  council = await makeUser("council-students", "council");
});

const upload = (csv: string, dryRun = false) =>
  importCsv(req(`/api/students/import${dryRun ? "?dryRun=1" : ""}`, { body: csv, headers: { "content-type": "text/csv" }, as: council }));
const find = async (q: string) => (await json(await listStudents(req(`/api/students?q=${encodeURIComponent(q)}`, { as: council })))).body.students;

const messy =
  "﻿Student No.,SURNAME,First Name,M.I.,Program,Year Level,Section,Email Address,Contact No\r\n" +
  "2023M1025,Dela Cruz,Juan,S,bscs,3rd Year,b,Juan.DelaCruz@school.edu.ph,0917\r\n" +
  '2023M1026,"Santos, Jr.",Pedro,,BSIT,Second Year,A,pedro@school.edu.ph,\r\n' +
  "2023M1028,Lim,Ana,,BSCS,7,A,ana@school.edu.ph,\r\n" +
  "2023M1029,Tan,Leo,,BSCS,1,A,leo@gmail.com,\r\n" +
  "2023M1025,Dup,Dupe,,BSCS,1,A,dupe@school.edu.ph,\r\n";

describe("CSV import", () => {
  it("previews without saving, then imports the valid rows", async () => {
    const preview = await json(await upload(messy, true));
    expect(preview.body.totals).toMatchObject({ rows: 5, created: 2, errors: 3 });
    expect(preview.body.ignoredColumns).toEqual(["Contact No"]);
    expect(preview.body.errors.map((e: any) => e.row)).toEqual([4, 5, 6]);
    expect(await find("2023M1025")).toHaveLength(0);

    const done = await json(await upload(messy));
    expect(done.body.totals.created).toBe(2);
    const [juan] = await find("2023M1025");
    expect(juan).toMatchObject({ name: "Juan S. Dela Cruz", course: "BSCS", year: "3", section: "B", email: "juan.delacruz@school.edu.ph" });
    expect((await find("Santos"))[0].name).toBe("Pedro Santos, Jr.");
  });

  it("is safe to re-run and updates by Student ID", async () => {
    expect((await json(await upload(messy))).body.totals).toMatchObject({ created: 0, unchanged: 2 });
    const res = await json(await upload("student_id;name;email;section\n2023M1025;Juan S. Dela Cruz;juan.delacruz@school.edu.ph;C\n"));
    expect(res.body.totals).toMatchObject({ updated: 1 });
    expect((await find("2023M1025"))[0].section).toBe("C");
  });

  it("explains files it can't use", async () => {
    expect((await json(await upload("Name,Course\nJuan,BSCS\n"))).body.message).toContain("Missing column(s): Student ID, Email");
    expect((await upload("")).status).toBe(400);
  });
});

describe("adding students and linking cards", () => {
  it("rejects duplicates and non-school emails", async () => {
    const add = (body: object) => addStudent(req("/api/students", { json: body, as: council }));
    expect((await add({ studentId: "2024M0001", name: "Ana", email: "ana2@school.edu.ph" })).status).toBe(201);
    expect((await add({ studentId: "2024M0001", name: "X", email: "x@school.edu.ph" })).status).toBe(409);
    expect((await add({ studentId: "2024M0002", name: "X", email: "ana2@school.edu.ph" })).status).toBe(409);
    expect((await add({ studentId: "2024M0003", name: "X", email: "x@gmail.com" })).status).toBe(400);
  });

  it("links a card to one student at a time", async () => {
    const [juan] = await find("2023M1025");
    const [pedro] = await find("2023M1026");
    const link = (id: string, rfid: string) => editStudent(req("", { method: "PATCH", json: { rfid }, as: council }), params({ studentId: id }));

    expect((await json(await link(juan.id, " 0012345678 "))).body.student.rfid).toBe("0012345678");
    const taken = await json(await link(pedro.id, "0012345678"));
    expect(taken.status).toBe(409);
    expect(taken.body.message).toContain("Juan S. Dela Cruz");
    await link(juan.id, "");
    expect((await link(pedro.id, "0012345678")).status).toBe(200);
    expect((await find("0012345678"))[0].id).toBe(pedro.id);
    expect((await link("not-an-id", "1")).status).toBe(404);
  });

  it("filters by card", async () => {
    const linked = (await json(await listStudents(req("/api/students?card=linked", { as: council })))).body;
    expect(linked.students.every((s: any) => s.rfid)).toBe(true);
    expect(linked.totals.withCard).toBe(linked.total);
  });
});
