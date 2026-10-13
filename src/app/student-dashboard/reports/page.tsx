'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StudentSidebar from '@/components/StudentSidebar';
import { Card, EmptyState, ErrorText, Field, inputClass, PageHeader, primaryButton, StatusPill, SuccessText } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { MAX_FILE_BYTES, MAX_FILES, REPORT_TYPES, type toReportJson } from '@/lib/reports';
import type { toEventJson } from '@/lib/events';

type ReportJson = ReturnType<typeof toReportJson>;
type EventJson = ReturnType<typeof toEventJson>;
type ReportType = keyof typeof REPORT_TYPES;

const ACCEPTED_FILES = 'image/jpeg,image/png,image/webp,application/pdf';

export default function StudentReports() {
  const [reports, setReports] = useState<ReportJson[] | null>(null);
  const [events, setEvents] = useState<EventJson[]>([]);
  const [loadError, setLoadError] = useState('');

  const [type, setType] = useState<ReportType>('excuse');
  const [eventId, setEventId] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ reports: ReportJson[]; events: EventJson[] }>('/api/student/reports')
      .then((d) => {
        setReports(d.reports);
        setEvents(d.events);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(load, [load]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const added = Array.from(list);
    const tooBig = added.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setResult({ ok: false, message: `"${tooBig.name}" is bigger than 2 MB. Take a smaller photo or compress the PDF.` });
    } else {
      setResult(null);
      setFiles((prev) => [...prev, ...added].slice(0, MAX_FILES));
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.set('type', type);
      form.set('eventId', eventId);
      form.set('message', message);
      files.forEach((f) => form.append('files', f));
      await api('/api/student/reports', { method: 'POST', body: form });
      setResult({ ok: true, message: 'Report sent. The council will review it, and you can follow its status below.' });
      setMessage('');
      setFiles([]);
      setEventId('');
      load();
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Reports" subtitle="Send an excuse letter, or tell the council about a mistake in your attendance" />

        <div className="p-4 sm:p-8 space-y-6">
          {loadError && <ErrorText>{loadError}</ErrorText>}

          <Card className="p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New report</h2>
            <form onSubmit={submit} className="space-y-5">
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">What is this about?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(REPORT_TYPES) as ReportType[]).map((t) => (
                    <label
                      key={t}
                      className={`flex gap-3 p-4 border-2 rounded-xl cursor-pointer ${type === t ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="mt-1" />
                      <span>
                        <span className="block font-semibold text-gray-900">{REPORT_TYPES[t]}</span>
                        <span className="block text-xs text-gray-600 mt-0.5">
                          {t === 'excuse'
                            ? 'You missed an event or were late for a valid reason.'
                            : 'Your record is wrong or missing, e.g. you were scanned but it doesn’t show.'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Field label="Event">
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} required className={inputClass}>
                  <option value="">{events.length ? 'Choose the event' : 'No events yet'}</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({formatDate(e.date)})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description" hint={`${message.length}/2000`}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={2000}
                  rows={5}
                  placeholder={type === 'excuse' ? 'Explain why you were absent or late.' : 'Explain what is wrong with your record.'}
                  className={inputClass}
                />
              </Field>

              <div>
                <label htmlFor="report-files" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attachments <span className="text-gray-500 font-normal">(optional, up to {MAX_FILES} photos or PDFs, 2 MB each)</span>
                </label>
                {files.length < MAX_FILES && (
                  <input
                    id="report-files"
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED_FILES}
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                )}
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className="truncate text-gray-800">{f.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className="text-red-600 font-semibold shrink-0"
                          aria-label={`Remove ${f.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {result && (result.ok ? <SuccessText>{result.message}</SuccessText> : <ErrorText>{result.message}</ErrorText>)}

              <button type="submit" disabled={busy || !events.length} className={`${primaryButton} w-full sm:w-auto sm:px-10`}>
                {busy ? 'Sending…' : 'Send report'}
              </button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 p-4 sm:p-6 pb-0 sm:pb-0">Your reports</h2>
            {reports && reports.length === 0 && <EmptyState title="You haven't sent any reports yet" />}
            {reports && reports.length > 0 && (
              <ul className="divide-y divide-gray-100 mt-2">
                {reports.map((r) => (
                  <li key={r.id} className="p-4 sm:p-6 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{r.event?.name ?? '(deleted event)'}</p>
                        <p className="text-xs text-gray-500">
                          {REPORT_TYPES[r.type]} · sent {formatDateTime(r.createdAt)}
                          {r.attachments.length > 0 && ` · ${r.attachments.length} attachment${r.attachments.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{r.message}</p>
                    {r.response && (
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">Council reply:</span> {r.response}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
