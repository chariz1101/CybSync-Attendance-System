'use client';

type Slice = { course: string; value: number; color: string };
type YearGroup = { year: string; values: Slice[] };

/** Donut chart of attendees per course, with a legend showing counts and percentages. */
export function CourseDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) return <p className="text-center text-sm text-gray-500 py-16">No attendance recorded yet.</p>;

  const r = 80;
  const circumference = 2 * Math.PI * r;
  // Each slice starts where the previous ones end.
  const slices = data.map((d, i) => ({
    ...d,
    length: (d.value / total) * circumference,
    offset: (data.slice(0, i).reduce((sum, p) => sum + p.value, 0) / total) * circumference,
  }));
  return (
    <div>
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-56 h-56 sm:w-64 sm:h-64">
          <svg viewBox="0 0 200 200" className="-rotate-90" role="img" aria-label="Attendance by course">
            {slices.map((d) => (
              <circle
                key={d.course}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="40"
                strokeDasharray={`${d.length} ${circumference}`}
                strokeDashoffset={-d.offset}
              >
                <title>{`${d.course}: ${d.value}`}</title>
              </circle>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-gray-500">attended</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {data.map((d) => (
          <div key={d.course} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            {d.course} <span className="text-gray-500">{d.value} ({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grouped bar chart: one group per year level, one bar per course. */
export function YearCourseBars({ data }: { data: YearGroup[] }) {
  const max = Math.max(0, ...data.flatMap((g) => g.values.map((v) => v.value)));
  if (!max) return <p className="text-center text-sm text-gray-500 py-16">No attendance recorded yet.</p>;

  const courses = data[0]?.values ?? [];
  return (
    <div>
      <div className="flex items-end justify-around gap-3 h-56 border-b border-gray-200 pb-1 overflow-x-auto">
        {data.map((group) => (
          <div key={group.year} className="flex items-end gap-1 h-full">
            {group.values.map((v) => (
              <div key={v.course} className="flex flex-col items-center justify-end h-full">
                <span className="text-[11px] font-semibold text-gray-700 mb-1">{v.value || ''}</span>
                <div
                  className="w-4 sm:w-6 rounded-t-md"
                  style={{ height: `${(v.value / max) * 85}%`, minHeight: v.value ? 4 : 0, backgroundColor: v.color }}
                  title={`${group.year} year, ${v.course}: ${v.value}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-3 mt-2">
        {data.map((group) => (
          <span key={group.year} className="text-sm font-medium text-gray-700">
            {group.year}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
        {courses.map((c) => (
          <div key={c.course} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
            {c.course}
          </div>
        ))}
      </div>
    </div>
  );
}
