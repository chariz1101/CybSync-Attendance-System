import { z } from "zod";

/** Fields a council member can set on a student. */
export type StudentInput = {
  studentId: string;
  name: string;
  course?: string;
  year?: string;
  section?: string;
  email: string;
  rfid?: string;
  status?: "active" | "inactive" | "suspended";
};

const YEAR_WORDS: Record<string, string> = { first: "1", second: "2", third: "3", fourth: "4", fifth: "5" };

/** Turns "3", "3rd", "3rd Year", "Third Year" or "III" into "3". Returns null if it isn't a year level. */
export function normalizeYear(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const digit = /^([1-5])(st|nd|rd|th)?(\s*year)?$/.exec(v);
  if (digit) return digit[1];
  const word = /^(first|second|third|fourth|fifth)(\s*year)?$/.exec(v);
  if (word) return YEAR_WORDS[word[1]];
  const roman = ({ i: "1", ii: "2", iii: "3", iv: "4", v: "5" } as Record<string, string>)[v];
  return roman ?? null;
}

function allowedDomain() {
  return process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || null;
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const studentInputSchema = z
  .object({
    studentId: z.string().trim().min(1, "Student ID is required"),
    name: z.string().trim().min(1, "Name is required"),
    course: optionalText.transform((v) => v?.toUpperCase()),
    year: optionalText,
    section: optionalText.transform((v) => v?.toUpperCase()),
    email: z.string().trim().min(1, "Email is required").toLowerCase().email("Email isn't a valid email address"),
    rfid: optionalText,
    status: z.enum(["active", "inactive", "suspended"]).optional(),
  })
  .superRefine((s, ctx) => {
    if (s.year !== undefined && normalizeYear(s.year) === null) {
      ctx.addIssue({ code: "custom", path: ["year"], message: `Year "${s.year}" should be 1–5 (e.g. 3, 3rd, Third Year)` });
    }
    const domain = allowedDomain();
    if (domain && !s.email.endsWith(`@${domain}`)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: `Email must be a school account (@${domain}) so the student can log in` });
    }
  })
  .transform((s) => ({ ...s, year: s.year === undefined ? undefined : normalizeYear(s.year)! }));

/** Partial version for editing one student. Empty rfid ("") means unlink the card. */
export const studentUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  course: z.string().trim().toUpperCase().optional(),
  year: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === "" || normalizeYear(v) !== null, "Year should be 1–5")
    .transform((v) => (v ? normalizeYear(v)! : v)),
  section: z.string().trim().toUpperCase().optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((v) => {
      const domain = allowedDomain();
      return !domain || v.endsWith(`@${domain}`);
    }, "Email must be a school account")
    .optional(),
  rfid: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Shape returned by the students API. */
export function toStudentJson(s: {
  id: string;
  studentId: string;
  name: string;
  course?: string;
  year?: string;
  section?: string;
  email: string;
  rfid?: string;
  status: string;
}) {
  return {
    id: s.id,
    studentId: s.studentId,
    name: s.name,
    course: s.course ?? "",
    year: s.year ?? "",
    section: s.section ?? "",
    email: s.email,
    rfid: s.rfid ?? "",
    status: s.status,
  };
}

/* ---------------- CSV import ---------------- */

// Accepted header names for each field, compared after lowercasing and removing
// spaces, underscores, dots and dashes. So "Student No.", "student_number" and
// "STUDENT ID" all map to studentId.
const HEADER_ALIASES: Record<string, string[]> = {
  studentId: ["studentid", "studentno", "studentnumber", "idnumber", "idno", "id", "schoolid"],
  name: ["name", "fullname", "studentname", "completename"],
  firstName: ["firstname", "givenname", "first"],
  middleName: ["middlename", "middleinitial", "mi", "middle"],
  lastName: ["lastname", "surname", "familyname", "last"],
  course: ["course", "program", "degree", "degreeprogram", "programcode", "coursecode"],
  year: ["year", "yearlevel", "level", "yr", "yearlvl"],
  section: ["section", "sec", "block", "class"],
  email: ["email", "emailaddress", "schoolemail", "institutionalemail", "googleemail", "gmail", "wvsuemail"],
  rfid: ["rfid", "rfidtag", "rfidno", "rfidnumber", "cardnumber", "cardno", "card", "rfidcard"],
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_.\-/]/g, "");

export type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

export function mapHeaders(headers: string[]): { columns: ColumnMap; missing: string[]; ignored: string[] } {
  const columns: ColumnMap = {};
  const ignored: string[] = [];
  headers.forEach((raw, index) => {
    const h = normalizeHeader(raw);
    const field = Object.keys(HEADER_ALIASES).find((f) => HEADER_ALIASES[f].includes(h)) as keyof typeof HEADER_ALIASES | undefined;
    if (field && columns[field] === undefined) columns[field] = index;
    else if (raw.trim()) ignored.push(raw.trim());
  });

  const missing: string[] = [];
  if (columns.studentId === undefined) missing.push("Student ID");
  if (columns.email === undefined) missing.push("Email");
  if (columns.name === undefined && (columns.firstName === undefined || columns.lastName === undefined)) {
    missing.push("Name (or First Name + Last Name)");
  }
  return { columns, missing, ignored };
}

/** Builds "Juan D. Dela Cruz" from separate name columns. */
export function composeName(first = "", middle = "", last = "") {
  const m = middle.trim();
  const middlePart = m ? (m.length <= 2 ? `${m.replace(/\.$/, "")}.` : `${m[0]}.`) : "";
  return [first.trim(), middlePart, last.trim()].filter(Boolean).join(" ");
}

export function rowToInput(row: string[], columns: ColumnMap) {
  const cell = (field: keyof ColumnMap) => (columns[field] === undefined ? undefined : (row[columns[field]!] ?? "").trim());
  const name = cell("name") || composeName(cell("firstName"), cell("middleName"), cell("lastName"));
  return {
    studentId: cell("studentId") ?? "",
    name,
    course: cell("course"),
    year: cell("year"),
    section: cell("section"),
    email: cell("email") ?? "",
    rfid: cell("rfid"),
  };
}
