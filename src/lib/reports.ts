// Shared rules and JSON shapes for student reports.

export const REPORT_TYPES = { excuse: "Excuse letter", discrepancy: "Attendance discrepancy" } as const;

export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // keeps a full upload under Vercel's 4.5 MB request limit
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

// Allowed attachment types, checked against the file's first bytes (not just its name).
const SIGNATURES: { type: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { type: "application/pdf", test: (b) => ascii(b, 0, 4) === "%PDF" },
];

function ascii(b: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...b.slice(start, end));
}

/** Detects JPEG, PNG, WebP or PDF from the file contents. Returns null for anything else. */
export function detectFileType(bytes: Uint8Array) {
  return SIGNATURES.find((s) => s.test(bytes))?.type ?? null;
}

type PopulatedStudent = { studentId?: string; name?: string; course?: string; year?: string; section?: string } | null;
type PopulatedEvent = { id?: string; name?: string; date?: string } | null;

export function toReportJson(r: {
  id: string;
  student: unknown;
  event?: unknown;
  type: string;
  message: string;
  attachments?: { id?: { toString(): string }; filename?: string; contentType?: string; size?: number }[];
  status: string;
  response?: string;
  reviewedBy?: { name?: string };
  reviewedAt?: Date;
  createdAt: Date;
}) {
  const s = r.student as PopulatedStudent;
  const e = (r.event ?? null) as PopulatedEvent;
  return {
    id: r.id,
    type: r.type as keyof typeof REPORT_TYPES,
    message: r.message,
    status: r.status as "pending" | "resolved" | "rejected",
    response: r.response ?? "",
    reviewedBy: r.reviewedBy?.name ?? "",
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    student: {
      studentId: s?.studentId ?? "",
      name: s?.name ?? "(deleted student)",
      course: s?.course ?? "",
      year: s?.year ?? "",
      section: s?.section ?? "",
    },
    event: e ? { id: e.id ?? "", name: e.name ?? "", date: e.date ?? "" } : null,
    attachments: (r.attachments ?? []).map((a) => ({
      id: a.id?.toString() ?? "",
      filename: a.filename ?? "",
      contentType: a.contentType ?? "",
      size: a.size ?? 0,
    })),
  };
}
