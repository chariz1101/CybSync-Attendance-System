import { Types } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { Student } from "@/models/Student";
import { YEAR_LABELS } from "@/lib/format";

// Chart colors for the department's courses ("BSCS" and "CS" both match CS).
const COURSE_COLORS: Record<string, string> = {
  CS: "#EF4444",
  IT: "#06B6D4",
  IS: "#A855F7",
  EMC: "#22C55E",
  LIS: "#F97316",
  BLIS: "#F97316",
};
const FALLBACK_COLORS = ["#3B82F6", "#EAB308", "#EC4899", "#14B8A6", "#8B5CF6", "#64748B"];

export function courseColor(course: string, index: number) {
  const key = course.toUpperCase().replace(/^BS/, "");
  return COURSE_COLORS[key] ?? COURSE_COLORS[course.toUpperCase()] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export type EventStats = {
  stats: {
    totalDepartmentStudents: number;
    totalStudentsAttended: number;
    attendanceRate: number;
    excused: number;
  };
  // Students who attended, by course (for the donut chart).
  courseDistribution: { course: string; value: number; color: string }[];
  // Students who attended, by year level and course (for the bar chart).
  yearCourseDistribution: { year: string; values: { course: string; value: number; color: string }[] }[];
};

/**
 * Attendance numbers for one event. A student counts as attended if they were
 * scanned at least once (on time or late); excused students are counted separately.
 */
export async function getEventStats(eventId: string | Types.ObjectId, totalStudents?: number): Promise<EventStats> {
  const event = new Types.ObjectId(String(eventId));
  const [totalDepartmentStudents, groups, excusedIds] = await Promise.all([
    totalStudents ?? Student.countDocuments({ status: "active" }),
    Attendance.aggregate<{ _id: { course?: string; year?: string }; count: number }>([
      { $match: { event, status: { $in: ["on-time", "late"] } } },
      { $group: { _id: "$student" } },
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "s" } },
      { $unwind: "$s" },
      { $group: { _id: { course: "$s.course", year: "$s.year" }, count: { $sum: 1 } } },
    ]),
    Attendance.distinct("student", { event, status: "excused" }),
  ]);

  const byCourse = new Map<string, number>();
  const byYear = new Map<string, Map<string, number>>();
  let attended = 0;
  for (const g of groups) {
    const course = g._id.course || "Other";
    const year = g._id.year || "?";
    attended += g.count;
    byCourse.set(course, (byCourse.get(course) ?? 0) + g.count);
    if (!byYear.has(year)) byYear.set(year, new Map());
    byYear.get(year)!.set(course, (byYear.get(year)!.get(course) ?? 0) + g.count);
  }

  const courses = [...byCourse.keys()].sort();
  const colors = new Map(courses.map((c, i) => [c, courseColor(c, i)]));
  const years = [...byYear.keys()].sort();

  return {
    stats: {
      totalDepartmentStudents,
      totalStudentsAttended: attended,
      attendanceRate: totalDepartmentStudents ? Math.min(100, Math.round((attended / totalDepartmentStudents) * 100)) : 0,
      excused: excusedIds.length,
    },
    courseDistribution: courses.map((course) => ({ course, value: byCourse.get(course)!, color: colors.get(course)! })),
    yearCourseDistribution: years.map((year) => ({
      year: YEAR_LABELS[year] ?? year,
      values: courses.map((course) => ({ course, value: byYear.get(year)!.get(course) ?? 0, color: colors.get(course)! })),
    })),
  };
}
