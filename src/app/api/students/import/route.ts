import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireStaff } from "@/lib/staff";
import { Student } from "@/models/Student";
import { parseCsv } from "@/lib/csv";
import { firstIssue, mapHeaders, rowToInput, studentInputSchema, type StudentInput } from "@/lib/students";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;

type RowResult = { row: number; studentId: string; message: string };
type ExistingStudent = StudentInput & { _id: unknown };

/**
 * POST /api/students/import?dryRun=1 with the CSV file as the request body.
 * Adds new students and updates existing ones (matched by Student ID).
 * With dryRun=1 nothing is saved; the response shows what would happen.
 */
export async function POST(req: Request) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const text = await req.text();
  if (!text.trim()) return NextResponse.json({ success: false, message: "The file is empty." }, { status: 400 });
  if (text.length > MAX_BYTES) return NextResponse.json({ success: false, message: "The file is too big (max 2 MB)." }, { status: 413 });

  const [headers, ...rows] = parseCsv(text);
  if (!rows.length) return NextResponse.json({ success: false, message: "The file has headers but no students." }, { status: 400 });
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ success: false, message: `Too many rows (${rows.length}). Import at most ${MAX_ROWS} at a time.` }, { status: 413 });
  }

  const { columns, missing, ignored } = mapHeaders(headers);
  if (missing.length) {
    return NextResponse.json(
      { success: false, message: `Missing column(s): ${missing.join(", ")}. Found: ${headers.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate every row and catch duplicates inside the file.
  const errors: RowResult[] = [];
  const valid: { row: number; data: StudentInput }[] = [];
  const seen = { studentId: new Map<string, number>(), email: new Map<string, number>(), rfid: new Map<string, number>() };

  rows.forEach((cells, i) => {
    const row = i + 2; // spreadsheet row number (row 1 is the header)
    const parsed = studentInputSchema.safeParse(rowToInput(cells, columns));
    if (!parsed.success) {
      errors.push({ row, studentId: cells[columns.studentId!]?.trim() ?? "", message: firstIssue(parsed.error) });
      return;
    }
    const data = parsed.data;
    for (const key of ["studentId", "email", "rfid"] as const) {
      const value = data[key];
      if (!value) continue;
      const earlier = seen[key].get(value);
      if (earlier) {
        errors.push({ row, studentId: data.studentId, message: `Same ${key === "rfid" ? "RFID" : key === "email" ? "email" : "Student ID"} as row ${earlier}` });
        return;
      }
    }
    for (const key of ["studentId", "email", "rfid"] as const) if (data[key]) seen[key].set(data[key]!, row);
    valid.push({ row, data });
  });

  // Compare with what's already in the database.
  await connectDB();
  const existing: ExistingStudent[] = await Student.find({
    $or: [
      { studentId: { $in: [...seen.studentId.keys()] } },
      { email: { $in: [...seen.email.keys()] } },
      { rfid: { $in: [...seen.rfid.keys()] } },
    ],
  }).lean();
  const byStudentId = new Map(existing.map((s) => [s.studentId, s]));
  const byEmail = new Map(existing.map((s) => [s.email, s]));
  const byRfid = new Map(existing.filter((s) => s.rfid).map((s) => [s.rfid!, s]));

  const ops: Parameters<typeof Student.bulkWrite>[0] = [];
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const { row, data } of valid) {
    const emailOwner = byEmail.get(data.email);
    if (emailOwner && emailOwner.studentId !== data.studentId) {
      errors.push({ row, studentId: data.studentId, message: `Email is already used by ${emailOwner.name} (${emailOwner.studentId})` });
      continue;
    }
    const cardOwner = data.rfid ? byRfid.get(data.rfid) : undefined;
    if (cardOwner && cardOwner.studentId !== data.studentId) {
      errors.push({ row, studentId: data.studentId, message: `RFID card is already linked to ${cardOwner.name} (${cardOwner.studentId})` });
      continue;
    }

    const current = byStudentId.get(data.studentId);
    if (!current) {
      ops.push({ insertOne: { document: data } });
      created++;
      continue;
    }

    // Only overwrite fields the file actually has a value for.
    const changes: Partial<StudentInput> = {};
    for (const key of ["name", "course", "year", "section", "email", "rfid"] as const) {
      if (data[key] !== undefined && data[key] !== current[key]) changes[key] = data[key];
    }
    if (Object.keys(changes).length) {
      ops.push({ updateOne: { filter: { studentId: data.studentId }, update: { $set: changes } } });
      updated++;
    } else {
      unchanged++;
    }
  }

  if (!dryRun && ops.length) {
    try {
      await Student.bulkWrite(ops, { ordered: false });
    } catch (err) {
      // Someone else changed the same students mid-import; the rest of the rows were still saved.
      if ((err as { code?: number }).code !== 11000) throw err;
      return NextResponse.json(
        { success: false, message: "Some rows clashed with changes made at the same time. Run the import again to finish." },
        { status: 409 }
      );
    }
  }

  errors.sort((a, b) => a.row - b.row);
  return NextResponse.json({
    success: true,
    dryRun,
    totals: { rows: rows.length, created, updated, unchanged, errors: errors.length },
    columns: Object.fromEntries(Object.entries(columns).map(([field, index]) => [field, headers[index!]])),
    ignoredColumns: ignored,
    errors,
  });
}
