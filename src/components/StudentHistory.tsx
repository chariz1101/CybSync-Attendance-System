'use client';

import { StatusPill } from '@/components/ui';
import { formatClock, formatDate } from '@/lib/format';
import type { studentHistory } from '@/lib/studentAttendance';

export type HistoryRow = ReturnType<typeof studentHistory>[number];

/** A student's attendance records: table on desktop, cards on phones. */
export function StudentHistory({ rows }: { rows: HistoryRow[] }) {
  if (!rows.length) return <p className="text-sm text-gray-500 py-6 text-center">No attendance recorded yet.</p>;
  const date = (r: HistoryRow) => formatDate(r.eventDate) || new Date(r.timestamp).toLocaleDateString();
  // Excused records come from an accepted excuse letter, not a scan, so they have no time.
  const time = (r: HistoryRow) => (r.type === 'Excused' ? '—' : formatClock(r.timestamp));
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-700">
              {['Type', 'Event', 'Date', 'Time', 'Status'].map((h) => (
                <th key={h} className="text-left py-3 px-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <td className="py-4 px-4 text-gray-900 font-medium whitespace-nowrap">{r.type || '—'}</td>
                <td className="py-4 px-4 text-gray-900">{r.event}</td>
                <td className="py-4 px-4 text-gray-900 whitespace-nowrap">{date(r)}</td>
                <td className="py-4 px-4 text-gray-900 whitespace-nowrap">{time(r)}</td>
                <td className="py-4 px-4">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{r.event}</div>
                <div className="text-xs text-gray-600">{r.type || '—'}</div>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
              <span>{date(r)}</span>
              <span>{time(r)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
