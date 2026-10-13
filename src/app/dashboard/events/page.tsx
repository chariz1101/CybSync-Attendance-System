'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  inputClass,
  Modal,
  PageHeader,
  primaryButton,
  secondaryButton,
  StatusPill,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatEventWhen } from '@/lib/format';
import { useCurrentUser } from '@/lib/useCurrentUser';
import type { toEventJson, toRequestJson } from '@/lib/events';

type EventJson = ReturnType<typeof toEventJson>;
type RequestJson = ReturnType<typeof toRequestJson>;
type Tab = 'events' | 'requests';

export default function EventsPage() {
  const user = useCurrentUser('/');
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<EventJson[] | null>(null);
  const [requests, setRequests] = useState<RequestJson[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EventJson | 'new' | null>(null);
  const [reviewing, setReviewing] = useState<RequestJson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, r] = await Promise.all([
        api<{ events: EventJson[] }>('/api/events'),
        api<{ requests: RequestJson[] }>('/api/events/requests'),
      ]);
      setEvents(e.events);
      setRequests(r.requests);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (event: EventJson, status: 'active' | 'past') => {
    const verb = status === 'active' ? (event.status === 'past' ? 'Reopen' : 'Start') : 'End';
    if (status === 'past' && !confirm(`End "${event.name}"? The scanner will stop accepting cards for it.`)) return;
    setBusyId(event.id);
    setError('');
    try {
      await api(`/api/events/${event.id}`, { method: 'PATCH', json: { status } });
      await load();
    } catch (err) {
      setError(`${verb} failed: ${(err as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (event: EventJson) => {
    if (!confirm(`Delete "${event.name}"? This can't be undone.`)) return;
    setBusyId(event.id);
    setError('');
    try {
      await api(`/api/events/${event.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const running = events?.filter((e) => e.status === 'active') ?? [];
  const upcoming = events?.filter((e) => e.status === 'upcoming') ?? [];
  const ended = (events?.filter((e) => e.status === 'past') ?? []).reverse();
  const pendingCount = requests?.filter((r) => r.status === 'pending').length ?? 0;

  const eventRow = (e: EventJson) => (
    <li key={e.id} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{e.name}</h3>
          <StatusPill status={e.status} />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {formatEventWhen(e)}
          {e.location && ` · ${e.location}`}
        </p>
        {e.description && <p className="text-sm text-gray-500 mt-1">{e.description}</p>}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {e.status === 'upcoming' && (
          <button disabled={busyId === e.id} onClick={() => changeStatus(e, 'active')} className={primaryButton}>
            Start event
          </button>
        )}
        {e.status === 'active' && (
          <>
            <Link href={`/dashboard/attendance?event=${e.id}`} className={primaryButton}>
              Open scanner
            </Link>
            <button disabled={busyId === e.id} onClick={() => changeStatus(e, 'past')} className={secondaryButton}>
              End event
            </button>
          </>
        )}
        {e.status === 'past' && (
          <>
            <Link href={`/dashboard/attendance?event=${e.id}`} className={secondaryButton}>
              View attendance
            </Link>
            <button disabled={busyId === e.id} onClick={() => changeStatus(e, 'active')} className={secondaryButton}>
              Reopen
            </button>
          </>
        )}
        {isAdmin && (
          <button onClick={() => setEditing(e)} className={secondaryButton}>
            Edit
          </button>
        )}
        {isAdmin && e.status === 'upcoming' && (
          <button disabled={busyId === e.id} onClick={() => remove(e)} className="px-4 py-2.5 text-red-700 hover:bg-red-50 font-semibold rounded-xl">
            Delete
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader
          title="Events"
          subtitle="Start an event to scan attendance, and end it when it's over"
          actions={
            isAdmin && (
              <button onClick={() => setEditing('new')} className={`${primaryButton} w-full sm:w-auto`}>
                New Event
              </button>
            )
          }
        />

        <div className="p-4 sm:p-8 space-y-6">
          <div className="flex gap-2 border-b border-gray-200">
            {(['events', 'requests'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 -mb-px border-b-2 font-semibold ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t === 'events' ? 'Events' : 'Requests'}
                {t === 'requests' && pendingCount > 0 && (
                  <span className="ml-2 inline-block text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          {tab === 'events' && events && (
            <>
              {events.length === 0 && (
                <Card>
                  <EmptyState title="No events yet">
                    {isAdmin ? (
                      <>Click <b>New Event</b>, or approve a request in the Requests tab.</>
                    ) : (
                      <>
                        Submit one on the{' '}
                        <Link href="/dashboard/request" className="text-blue-600 font-semibold hover:underline">
                          Request
                        </Link>{' '}
                        page. An admin approves it and it appears here.
                      </>
                    )}
                  </EmptyState>
                </Card>
              )}
              {[
                ['Running now', running],
                ['Upcoming', upcoming],
                ['Ended', ended],
              ].map(([label, list]) =>
                (list as EventJson[]).length ? (
                  <Card key={label as string}>
                    <h2 className="px-4 sm:px-6 pt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">{label as string}</h2>
                    <ul className="divide-y divide-gray-100">{(list as EventJson[]).map(eventRow)}</ul>
                  </Card>
                ) : null
              )}
            </>
          )}

          {tab === 'requests' && requests && (
            <Card>
              {requests.length === 0 ? (
                <EmptyState title="No event requests">
                  Council members submit them on the{' '}
                  <Link href="/dashboard/request" className="text-blue-600 font-semibold hover:underline">
                    Request
                  </Link>{' '}
                  page.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {requests.map((r) => (
                    <li key={r.id} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{r.eventTitle}</h3>
                          <StatusPill status={r.status} />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatEventWhen({ date: r.dateStart, endDate: r.dateEnd, startTime: r.timeStart, endTime: r.timeEnd })}
                          {r.location && ` · ${r.location}`}
                        </p>
                        {r.shortDescription && <p className="text-sm text-gray-500 mt-1">{r.shortDescription}</p>}
                        <p className="text-xs text-gray-500 mt-2">
                          Requested by {r.requestedBy || 'unknown'} · {formatDateTime(r.createdAt)}
                          {r.reviewedBy && ` · ${r.status === 'approved' ? 'Approved' : 'Rejected'} by ${r.reviewedBy}`}
                          {r.reviewNotes && ` · "${r.reviewNotes}"`}
                        </p>
                      </div>
                      {r.status === 'pending' &&
                        (isAdmin ? (
                          <button onClick={() => setReviewing(r)} className={`${primaryButton} shrink-0`}>
                            Review
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500 shrink-0">Waiting for an admin</span>
                        ))}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </main>

      {editing && (
        <EventFormModal
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EventFormModal({ event, onClose, onSaved }: { event: EventJson | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: event?.name ?? '',
    date: event?.date ?? '',
    startTime: event?.startTime ?? '',
    endDate: event?.endDate ?? '',
    endTime: event?.endTime ?? '',
    location: event?.location ?? '',
    description: event?.description ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(event ? `/api/events/${event.id}` : '/api/events', { method: event ? 'PATCH' : 'POST', json: form });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Event name">
          <input value={form.name} onChange={set('name')} required className={inputClass} placeholder="e.g. University Days 2026 – Day 1" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input type="date" value={form.date} onChange={set('date')} required className={inputClass} />
          </Field>
          <Field label="Start time">
            <input type="time" value={form.startTime} onChange={set('startTime')} className={inputClass} />
          </Field>
          <Field label="End date" hint="Leave blank for a one-day event">
            <input type="date" value={form.endDate} onChange={set('endDate')} className={inputClass} />
          </Field>
          <Field label="End time">
            <input type="time" value={form.endTime} onChange={set('endTime')} className={inputClass} />
          </Field>
        </div>
        <Field label="Location">
          <input value={form.location} onChange={set('location')} className={inputClass} placeholder="e.g. University Gym" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set('description')} rows={3} className={inputClass} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewModal({ request, onClose, onDone }: { request: RequestJson; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (action: 'approve' | 'reject') => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/events/requests/${request.id}`, { method: 'POST', json: { action, notes } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Review event request" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-semibold text-gray-900">{request.eventTitle}</p>
          <p className="text-sm text-gray-600 mt-1">
            {formatEventWhen({ date: request.dateStart, endDate: request.dateEnd, startTime: request.timeStart, endTime: request.timeEnd })}
            {request.location && ` · ${request.location}`}
          </p>
          {request.shortDescription && <p className="text-sm text-gray-700 mt-2">{request.shortDescription}</p>}
          <p className="text-xs text-gray-500 mt-2">Requested by {request.requestedBy}</p>
        </div>
        <Field label="Notes (optional)" hint="Shown with the request, e.g. why it was rejected">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <p className="text-sm text-gray-600">Approving adds it to Events as an upcoming event.</p>
        <div className="flex justify-end gap-2">
          <button disabled={busy} onClick={() => review('reject')} className="px-4 py-2.5 text-red-700 hover:bg-red-50 font-semibold rounded-xl">
            Reject
          </button>
          <button disabled={busy} onClick={() => review('approve')} className={primaryButton}>
            Approve
          </button>
        </div>
      </div>
    </Modal>
  );
}
