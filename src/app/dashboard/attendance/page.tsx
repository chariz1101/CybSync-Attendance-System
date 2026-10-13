'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { Card, EmptyState, ErrorText, inputClass, PageHeader, primaryButton, secondaryButton, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatClock, formatDateTime, formatEventWhen, yearLabel } from '@/lib/format';
import { ACTIONS, SESSIONS, type toRecordJson } from '@/lib/attendance';
import type { toEventJson } from '@/lib/events';
import type { EventStats } from '@/lib/eventStats';
import { lateNote } from '@/lib/late';

type EventJson = ReturnType<typeof toEventJson>;
type RecordJson = ReturnType<typeof toRecordJson>;
type RecordsData = EventStats & { event: EventJson; records: RecordJson[] };
type ScanResult = { ok: boolean; late?: boolean; message: string };

export default function Attendance() {
  const [events, setEvents] = useState<EventJson[] | null>(null);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState<RecordsData | null>(null);
  const [error, setError] = useState('');

  const [session, setSession] = useState<(typeof SESSIONS)[number]>('AM');
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('Sign In');
  const [card, setCard] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Running events first, then ended ones (view only).
  useEffect(() => {
    api<{ events: EventJson[] }>('/api/events?status=active,past')
      .then(({ events }) => {
        const sorted = [...events.filter((e) => e.status === 'active'), ...events.filter((e) => e.status === 'past').reverse()];
        setEvents(sorted);
        const fromUrl = new URLSearchParams(window.location.search).get('event');
        setEventId(sorted.find((e) => e.id === fromUrl)?.id ?? sorted.find((e) => e.status === 'active')?.id ?? sorted[0]?.id ?? '');
      })
      .catch((e) => setError(e.message));
  }, []);

  const loadRecords = useCallback(async () => {
    if (!eventId) return;
    try {
      setData(await api<RecordsData>(`/api/attendance/records?eventId=${eventId}`));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [eventId]);

  useEffect(() => {
    setData(null);
    setLastScan(null);
    loadRecords();
  }, [loadRecords]);

  const isRunning = data?.event.status === 'active';

  // Keep the card input focused while the scanner is in use.
  useEffect(() => {
    if (isRunning && !scanning) inputRef.current?.focus();
  }, [isRunning, scanning, session, action]);

  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = card.trim();
    if (!value || scanning) return;
    setScanning(true);
    setCard('');
    try {
      const res = await api<{ record: RecordJson }>('/api/attendance/scan', {
        method: 'POST',
        json: { rfid: value, eventId, type: session, action },
      });
      const r = res.record;
      setLastScan({
        ok: true,
        late: r.status === 'late',
        message: `${r.name} (${r.studentId}) · ${session} ${action} at ${formatClock(r.timestamp)}${r.status === 'late' ? ' · LATE' : ''}`,
      });
      setData((d) => (d ? { ...d, records: [r, ...d.records] } : d));
      loadRecords(); // refresh the stats
    } catch (err) {
      setLastScan({ ok: false, message: (err as Error).message });
    } finally {
      setScanning(false);
    }
  };

  const shown = data?.records.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || `${r.studentId} ${r.name} ${r.course} ${r.section}`.toLowerCase().includes(q);
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Student ID', 'Name', 'Course', 'Year', 'Section', 'Session', 'Action', 'Time', 'Status'],
      ...data.records.map((r) => [r.studentId, r.name, r.course, r.year, r.section, r.type, r.action, formatDateTime(r.timestamp), r.status]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${data.event.name} attendance.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Attendance" subtitle={data ? `${data.event.name} · ${formatEventWhen(data.event)}` : ' '} />

        <div className="p-4 sm:p-8 space-y-6">
          {error && <ErrorText>{error}</ErrorText>}

          {events && events.length === 0 && (
            <Card>
              <EmptyState title="No event is running">
                Start an event on the{' '}
                <Link href="/dashboard/events" className="text-blue-600 font-semibold hover:underline">
                  Events
                </Link>{' '}
                page to begin scanning.
              </EmptyState>
            </Card>
          )}

          {events && events.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label htmlFor="event-select" className="text-sm font-medium text-gray-700">
                Event
              </label>
              <select
                id="event-select"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-80"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.status === 'active' ? '● ' : ''}
                    {e.name} {e.status === 'past' ? '(ended)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Total Department Students" value={data.stats.totalDepartmentStudents} icon="students" iconColor="red" />
                <StatCard title="Total Students Attended" value={data.stats.totalStudentsAttended} icon="attended" iconColor="blue" />
                <StatCard title="Attendance Rate" value={`${data.stats.attendanceRate}%`} icon="rate" iconColor="green" />
              </div>

              {/* Scanner */}
              {isRunning ? (
                <Card className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <Toggle label="Session" options={SESSIONS} value={session} onChange={setSession} />
                    <Toggle label="Scan" options={ACTIONS} value={action} onChange={setAction} />
                  </div>
                  <form onSubmit={scan} className="flex flex-col sm:flex-row gap-3">
                    <input
                      ref={inputRef}
                      value={card}
                      onChange={(e) => setCard(e.target.value)}
                      readOnly={scanning}
                      autoComplete="off"
                      aria-label="RFID card or Student ID"
                      placeholder="Tap a card on the reader, or type a Student ID and press Enter"
                      className={`${inputClass} text-lg font-mono border-2 border-blue-300 bg-white`}
                    />
                    <button type="submit" disabled={!card.trim() || scanning} className={`${primaryButton} px-8`}>
                      Enter
                    </button>
                  </form>
                  {lastScan && (
                    <p
                      role="status"
                      className={`text-base font-medium rounded-xl px-4 py-3 border ${
                        !lastScan.ok
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : lastScan.late
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-900'
                            : 'bg-green-50 border-green-200 text-green-800'
                      }`}
                    >
                      {lastScan.ok ? '✓ ' : '✗ '}
                      {lastScan.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {lateNote(data.event) ? `${lateNote(data.event)}. ` : 'This event has no start time, so every scan counts as on time. '}
                    USB RFID readers type the card number and press Enter automatically. Keep this page open and the box focused.
                  </p>
                </Card>
              ) : (
                <p className="text-sm text-gray-600 bg-gray-100 rounded-xl px-4 py-3">
                  This event has ended, so the scanner is off. To add late scans, reopen it on the{' '}
                  <Link href="/dashboard/events" className="text-blue-600 font-semibold hover:underline">
                    Events
                  </Link>{' '}
                  page.
                </p>
              )}

              {/* Records */}
              <Card className="overflow-hidden">
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 flex-1">
                    Records <span className="text-gray-500 font-normal">({data.records.length})</span>
                  </h2>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search records"
                    className={`${inputClass} sm:w-64`}
                  />
                  <button onClick={exportCsv} disabled={!data.records.length} className={secondaryButton}>
                    Export CSV
                  </button>
                </div>

                {shown && shown.length === 0 ? (
                  <EmptyState title={data.records.length ? 'No records match your search' : 'No one has been scanned yet'} />
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            {['ID', 'Name', 'Course', 'Year', 'Section', 'Session', 'Time', 'Status'].map((h) => (
                              <th key={h} className="px-6 py-3 text-left font-semibold whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {shown?.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-mono whitespace-nowrap">{r.studentId}</td>
                              <td className="px-6 py-3 whitespace-nowrap">{r.name}</td>
                              <td className="px-6 py-3">{r.course}</td>
                              <td className="px-6 py-3">{yearLabel(r.year)}</td>
                              <td className="px-6 py-3">{r.section}</td>
                              <td className="px-6 py-3 whitespace-nowrap">{[r.type, r.action].filter(Boolean).join(' · ')}</td>
                              <td className="px-6 py-3 whitespace-nowrap">{scanTime(r)}</td>
                              <td className="px-6 py-3">
                                <StatusPill status={r.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul className="md:hidden divide-y divide-gray-100">
                      {shown?.map((r) => (
                        <li key={r.id} className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{r.name}</p>
                            <p className="text-xs text-gray-600">
                              <span className="font-mono">{r.studentId}</span> · {r.course} {yearLabel(r.year)} {r.section}
                            </p>
                            <p className="text-xs text-gray-600">
                              {[r.type, r.action, scanTime(r)].filter((x) => x && x !== '—').join(' · ')}
                            </p>
                          </div>
                          <StatusPill status={r.status} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Excused records are added when the council accepts an excuse letter; they have no scan time.
function scanTime(r: RecordJson) {
  return r.action === 'Excused' ? '—' : formatClock(r.timestamp);
}

function Toggle<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`px-4 py-2 text-sm font-semibold ${value === o ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
