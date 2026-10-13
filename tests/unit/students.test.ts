import { describe, expect, it } from "vitest";
import { composeName, mapHeaders, normalizeYear, rowToInput, studentInputSchema } from "@/lib/students";

describe("normalizeYear", () => {
  it.each([
    ["3", "3"], ["3rd", "3"], ["3rd Year", "3"], ["Third Year", "3"], ["iii", "3"], ["1st", "1"], ["IV", "4"],
  ])("%s → %s", (input, out) => expect(normalizeYear(input)).toBe(out));

  it.each(["7", "0", "senior", ""])("rejects %j", (input) => expect(normalizeYear(input)).toBeNull());
});

describe("mapHeaders", () => {
  it("recognizes common class-list headers", () => {
    const { columns, missing, ignored } = mapHeaders(["Student No.", "SURNAME", "First Name", "M.I.", "Program", "Year Level", "Section", "Email Address", "Contact No"]);
    expect(missing).toEqual([]);
    expect(ignored).toEqual(["Contact No"]);
    expect(columns).toMatchObject({ studentId: 0, lastName: 1, firstName: 2, middleName: 3, course: 4, year: 5, section: 6, email: 7 });
  });

  it("reports missing required columns", () => {
    expect(mapHeaders(["Name", "Course"]).missing).toEqual(["Student ID", "Email"]);
    expect(mapHeaders(["ID", "Email", "First Name"]).missing).toEqual(["Name (or First Name + Last Name)"]);
  });
});

describe("composeName / rowToInput", () => {
  it("shortens the middle name to an initial", () => {
    expect(composeName("Juan", "Santos", "Dela Cruz")).toBe("Juan S. Dela Cruz");
    expect(composeName("Maria", "C.", "Reyes")).toBe("Maria C. Reyes");
    expect(composeName("Ana", "", "Lim")).toBe("Ana Lim");
  });

  it("prefers a full-name column", () => {
    const { columns } = mapHeaders(["ID", "Full Name", "Email"]);
    expect(rowToInput(["1", "Ana Lim", "ana@school.edu.ph"], columns)).toMatchObject({ studentId: "1", name: "Ana Lim" });
  });
});

describe("studentInputSchema", () => {
  const base = { studentId: " 2023M1 ", name: "Juan", email: "Juan@School.edu.ph", course: "bscs", section: "b", year: "Third Year" };

  it("normalizes fields", () => {
    expect(studentInputSchema.parse(base)).toMatchObject({ studentId: "2023M1", email: "juan@school.edu.ph", course: "BSCS", section: "B", year: "3" });
  });

  it("requires a school email (ALLOWED_EMAIL_DOMAIN)", () => {
    const r = studentInputSchema.safeParse({ ...base, email: "juan@gmail.com" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("@school.edu.ph");
  });

  it("explains a missing email and a bad year", () => {
    expect(studentInputSchema.safeParse({ ...base, email: "" }).error?.issues[0].message).toBe("Email is required");
    expect(studentInputSchema.safeParse({ ...base, year: "9" }).error?.issues[0].message).toContain("should be 1–5");
  });
});
