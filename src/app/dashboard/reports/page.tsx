'use client';

import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, EmptyState, ErrorText, inputClass, PageHeader, primaryButton, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, yearLabel } from '@/lib/format';
import { REPORT_TYPES, type toReportJson } from '@/lib/reports';

type ReportJson = ReturnType<typeof toReportJson>;
type ReportsData = { pendingReports: ReportJson[]; previousReports: ReportJson[] };

export default function Reports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'pending' | 'previous'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ReportsData>('/api/reports')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const list = section === 'pending' ? data?.pendingReports : data?.previousReports;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Reports" subtitle="Excuse letters and attendance discrepancies sent by students" />

        <div className="p-4 sm:p-8 space-y-6">
          <div className="flex gap-2 border-b border-gray-200">
            {(['pending', 'previous'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-4 py-2.5 -mb-px border-b-2 font-semibold ${
                  section === s ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'pending' ? 'Pending' : 'Reviewed'}
                {s === 'pending' && !!data?.pendingReports.length && (
                  <span className="ml-2 inline-block text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{data.pendingReports.length}</span>
                )}
              </button>
            ))}
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          {list && (
            <Card className="overflow-hidden">
              {list.length === 0 ? (
                <EmptyState title={section === 'pending' ? 'No pending reports' : 'No reviewed reports yet'} />
              ) : (
                <ul className="divide-y divide-gray-200">
                  {list.map((r) => (
                    <ReportItem
                      key={r.id}
                      report={r}
                      expanded={expandedId === r.id}
                      onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      onReviewed={() => {
                        setExpandedId(null);
                        load();
                      }}
                    />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function ReportItem({ report: r, expanded, onToggle, onReviewed }: { report: ReportJson; expanded: boolean; onToggle: () => void; onReviewed: () => void }) {
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const studentLine = `${r.student.studentId} · ${[r.student.course, yearLabel(r.student.year), r.student.section].filter(Boolean).join(' ')}`;

  const review = async (action: 'accept' | 'reject') => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/reports/${r.id}/${action}`, {
        method: 'POST',
        json: action === 'accept' ? { response } : { reason: response },
      });
      onReviewed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <button onClick={onToggle} aria-expanded={expanded} className="w-full text-left grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 p-4 sm:p-6 hover:bg-gray-50">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{r.student.name}</h3>
          <p className="text-xs text-gray-500 mt-1">{studentLine}</p>
        </div>
        <div className="min-w-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{r.event?.name ?? '(deleted event)'}</h3>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {REPORT_TYPES[r.type]} · {formatDateTime(r.createdAt)} · {r.message}
            </p>
          </div>
          <StatusPill status={r.status} />
        </div>
      </button>

      {expanded && (
        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {REPORT_TYPES[r.type]} · {r.event?.name} {r.event?.date && `(${formatDate(r.event.date)})`}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mt-2">{r.message}</p>
          </div>

          {r.attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {r.attachments.map((a) => {
                const url = `/api/reports/attachments/${a.id}`;
                return (
                  <a key={a.id} href={url} target="_blank" rel="noreferrer" className="block border border-gray-300 rounded-lg overflow-hidden bg-white hover:shadow">
                    {a.contentType.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element -- authenticated API image, not optimizable
                      <img src={url} alt={a.filename} className="w-full h-48 object-contain bg-gray-100" />
                    ) : (
                      <div className="h-48 flex items-center justify-center bg-gray-100 text-gray-600 text-sm font-semibold">PDF</div>
                    )}
                    <p className="px-3 py-2 text-xs text-gray-700 truncate">{a.filename}</p>
                  </a>
                );
              })}
            </div>
          )}

          {r.status === 'pending' ? (
            <div className="space-y-3">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={2}
                placeholder="Reply to the student (optional, shown on their Reports page)"
                className={inputClass}
              />
              {r.type === 'excuse' && (
                <p className="text-xs text-gray-600">
                  Accepting marks the student <b>Excused</b> for this event (their late scans become excused; if they weren&apos;t
                  scanned at all, an excused record is added).
                </p>
              )}
              {r.type === 'discrepancy' && (
                <p className="text-xs text-gray-600">
                  Accepting marks the report resolved. Fix the record itself on the Attendance page if needed (e.g. reopen the event and scan the
                  student).
                </p>
              )}
              {error && <ErrorText>{error}</ErrorText>}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button disabled={busy} onClick={() => review('accept')} className={`${primaryButton} sm:px-12`}>
                  Accept
                </button>
                <button
                  disabled={busy}
                  onClick={() => review('reject')}
                  className="sm:px-12 px-4 py-2.5 border-2 border-red-600 text-red-700 font-semibold rounded-xl hover:bg-red-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              {r.status === 'resolved' ? 'Accepted' : 'Rejected'} by {r.reviewedBy || 'unknown'} · {formatDateTime(r.reviewedAt)}
              {r.response && (
                <>
                  <br />
                  <span className="text-gray-600">Reply: “{r.response}”</span>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
