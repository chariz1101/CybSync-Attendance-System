'use client';

import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorText, Field, Modal } from '@/components/ui';

interface Student {
  id: string;
  studentId: string;
  name: string;
  course: string;
  year: string;
  section: string;
  email: string;
  rfid: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface StudentList {
  students: Student[];
  page: number;
  pageSize: number;
  total: number;
  totals: { students: number; withCard: number };
}

type CardFilter = 'all' | 'linked' | 'unlinked';

const YEAR_LABELS: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th' };

function classLabel(s: Pick<Student, 'course' | 'year' | 'section'>) {
  const year = s.year ? YEAR_LABELS[s.year] ?? s.year : '';
  return [s.course, [year && `${year} yr`, s.section].filter(Boolean).join(' - ')].filter(Boolean).join(' · ') || '—';
}

async function readJson(res: Response) {
  return res.json().catch(() => ({ message: `Request failed (${res.status})` }));
}

export default function StudentsPage() {
  const [data, setData] = useState<StudentList | null>(null);
  const [query, setQuery] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Student | 'new' | null>(null);
  const [linking, setLinking] = useState<Student | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set('q', query.trim());
    if (cardFilter !== 'all') params.set('card', cardFilter);
    try {
      const res = await fetch(`/api/students?${params}`);
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.message || json.error);
      setData(json);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load students.');
    }
  }, [page, query, cardFilter]);

  // Debounce typing in the search box.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const withCard = data?.totals.withCard ?? 0;
  const totalStudents = data?.totals.students ?? 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="lg:ml-0 ml-12">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Students</h1>
              <p className="text-sm text-gray-600 mt-1">Import class lists and link RFID cards</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowImport(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                Import CSV
              </button>
              <button
                onClick={() => setEditing('new')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow"
              >
                Add Student
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <StatCard title="Total Students" value={totalStudents} icon="students" iconColor="blue" />
            <StatCard title="With RFID Card" value={withCard} icon="rate" iconColor="green" />
            <StatCard title="Without RFID Card" value={totalStudents - withCard} icon="attended" iconColor="red" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            {/* Toolbar */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 border-b border-gray-200">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, Student ID, email, course or card number"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400"
              />
              <select
                value={cardFilter}
                onChange={(e) => {
                  setCardFilter(e.target.value as CardFilter);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by RFID card"
              >
                <option value="all">All students</option>
                <option value="linked">With RFID card</option>
                <option value="unlinked">Without RFID card</option>
              </select>
            </div>

            {loadError && <p className="p-6 text-red-600">{loadError}</p>}

            {data && data.students.length === 0 && (
              <div className="p-10 text-center text-gray-500">
                {totalStudents === 0 ? (
                  <>
                    <p className="text-lg font-medium text-gray-700">No students yet</p>
                    <p className="text-sm mt-1">Import your class list with <b>Import CSV</b>, or add students one at a time.</p>
                  </>
                ) : (
                  <p>No students match your search.</p>
                )}
              </div>
            )}

            {data && data.students.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b border-gray-200">
                        <th className="px-6 py-3 font-semibold">Student ID</th>
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Course · Year - Section</th>
                        <th className="px-6 py-3 font-semibold">Email</th>
                        <th className="px-6 py-3 font-semibold">RFID Card</th>
                        <th className="px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 font-mono text-gray-900">{s.studentId}</td>
                          <td className="px-6 py-3 text-gray-900">
                            {s.name}
                            {s.status !== 'active' && <StatusBadge status={s.status} />}
                          </td>
                          <td className="px-6 py-3 text-gray-700">{classLabel(s)}</td>
                          <td className="px-6 py-3 text-gray-700 break-all">{s.email}</td>
                          <td className="px-6 py-3">
                            <CardButton student={s} onClick={() => setLinking(s)} />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => setEditing(s)} className="text-blue-600 hover:underline font-medium">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {data.students.map((s) => (
                    <li key={s.id} className="p-4 space-y-2">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {s.name}
                            {s.status !== 'active' && <StatusBadge status={s.status} />}
                          </p>
                          <p className="text-xs text-gray-600 font-mono">{s.studentId}</p>
                        </div>
                        <button onClick={() => setEditing(s)} className="text-blue-600 text-sm font-medium shrink-0">
                          Edit
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">{classLabel(s)}</p>
                      <p className="text-xs text-gray-600 break-all">{s.email}</p>
                      <CardButton student={s} onClick={() => setLinking(s)} />
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 sm:px-6 border-t border-gray-200 text-sm text-gray-600">
                  <span>
                    {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setPage(1);
            load();
          }}
        />
      )}
      {editing && (
        <StudentFormModal
          student={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {linking && (
        <LinkCardModal
          student={linking}
          onClose={() => {
            setLinking(null);
            load();
          }}
          onNext={(next) => setLinking(next)}
        />
      )}
    </div>
  );
}

/* ---------------- Small pieces ---------------- */

function StatusBadge({ status }: { status: Student['status'] }) {
  return (
    <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
      {status}
    </span>
  );
}

function CardButton({ student, onClick }: { student: Student; onClick: () => void }) {
  return student.rfid ? (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-green-700 hover:underline text-sm" title="Change or unlink card">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      <span className="font-mono">{student.rfid}</span>
    </button>
  ) : (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
    >
      Link card
    </button>
  );
}

/* ---------------- Import ---------------- */

interface ImportResult {
  dryRun: boolean;
  totals: { rows: number; created: number; updated: number; unchanged: number; errors: number };
  columns: Record<string, string>;
  ignoredColumns: string[];
  errors: { row: number; studentId: string; message: string }[];
}

const FIELD_LABELS: Record<string, string> = {
  studentId: 'Student ID',
  name: 'Name',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  course: 'Course',
  year: 'Year',
  section: 'Section',
  email: 'Email',
  rfid: 'RFID',
};

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (selected: File, dryRun: boolean) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/students/import${dryRun ? '?dryRun=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: await selected.text(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.message);
      if (dryRun) setPreview(json);
      else {
        setDone(json);
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const result = done ?? preview;
  const willSave = preview ? preview.totals.created + preview.totals.updated : 0;

  return (
    <Modal title="Import students from CSV" onClose={onClose} wide>
      <div className="space-y-5">
        {!done && (
          <>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Upload your class list as a <b>.csv</b> file (in Excel or Google Sheets: <i>File → Save as / Download → CSV</i>).
                Students already in the system are matched by Student ID and updated.
              </p>
              <p>
                <a href="/students-template.csv" download className="text-blue-600 font-semibold hover:underline">
                  Download the template
                </a>{' '}
                · Required columns: <b>Student ID</b>, <b>Email</b> (school account), and <b>Name</b> or <b>First Name + Last Name</b>.
                Optional: Middle Name, Course, Year, Section, RFID.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs border border-gray-200 rounded-lg">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {['Student ID', 'Last Name', 'First Name', 'Middle Name', 'Course', 'Year', 'Section', 'Email', 'RFID'].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-800">
                    {['2023M1025', 'Dela Cruz', 'Juan', 'Santos', 'BSCS', '3', 'B', 'juan.delacruz@school.edu.ph', ''].map((c, i) => (
                      <td key={i} className="px-2 py-1.5 whitespace-nowrap border-t border-gray-200">{c || <span className="text-gray-400">(blank)</span>}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <label className="block">
              <span className="sr-only">CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setPreview(null);
                  if (f) send(f, true);
                }}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </>
        )}

        {busy && <p className="text-sm text-gray-600">{preview ? 'Importing…' : 'Checking file…'}</p>}
        {error && <ErrorText>{error}</ErrorText>}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Count label={done ? 'Added' : 'Will add'} value={result.totals.created} tone="green" />
              <Count label={done ? 'Updated' : 'Will update'} value={result.totals.updated} tone="blue" />
              <Count label="Unchanged" value={result.totals.unchanged} tone="gray" />
              <Count label="Rows with errors" value={result.totals.errors} tone="red" />
            </div>

            <p className="text-xs text-gray-600">
              Columns used:{' '}
              {Object.entries(result.columns)
                .map(([field, header]) => `${header} → ${FIELD_LABELS[field] ?? field}`)
                .join(', ')}
              {result.ignoredColumns.length > 0 && <> · Ignored: {result.ignoredColumns.join(', ')}</>}
            </p>

            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  {done ? 'These rows were skipped:' : 'These rows will be skipped. Fix them in your file and upload again, or import the rest now:'}
                </p>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Row</th>
                        <th className="px-3 py-2 text-left font-semibold">Student ID</th>
                        <th className="px-3 py-2 text-left font-semibold">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.row} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{e.row}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{e.studentId || '—'}</td>
                          <td className="px-3 py-2 text-red-700">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-800 hover:bg-gray-50">
            {done ? 'Done' : 'Cancel'}
          </button>
          {!done && preview && file && (
            <button
              disabled={busy || willSave === 0}
              onClick={() => send(file, false)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold"
            >
              {willSave === 0 ? 'Nothing to import' : `Import ${willSave} student${willSave === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'gray' | 'red' }) {
  const tones = {
    green: 'bg-green-50 text-green-800',
    blue: 'bg-blue-50 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-50 text-red-800',
  };
  return (
    <div className={`rounded-xl px-3 py-3 ${tones[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

/* ---------------- Add / edit ---------------- */

function StudentFormModal({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    studentId: student?.studentId ?? '',
    name: student?.name ?? '',
    course: student?.course ?? '',
    year: student?.year ?? '',
    section: student?.section ?? '',
    email: student?.email ?? '',
    status: student?.status ?? 'active',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { studentId, ...editable } = form;
      const res = student
        ? await fetch(`/api/students/${student.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editable),
          })
        : await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, ...editable }),
          });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.message);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-500';

  return (
    <Modal title={student ? `Edit ${student.name}` : 'Add student'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Student ID">
          <input value={form.studentId} onChange={set('studentId')} required disabled={!!student} className={input} placeholder="e.g. 2023M1025" />
        </Field>
        <Field label="Full name">
          <input value={form.name} onChange={set('name')} required className={input} placeholder="e.g. Juan S. Dela Cruz" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Course">
            <input value={form.course} onChange={set('course')} className={input} placeholder="BSCS" />
          </Field>
          <Field label="Year">
            <select value={form.year} onChange={set('year')} className={input}>
              <option value="">—</option>
              {Object.entries(YEAR_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <input value={form.section} onChange={set('section')} className={input} placeholder="B" />
          </Field>
        </div>
        <Field label="School email" hint="Must be the student's school Google account. They use it to log in.">
          <input type="email" value={form.email} onChange={set('email')} required className={input} />
        </Field>
        {student && (
          <Field label="Status" hint="Inactive or suspended students can't log in.">
            <select value={form.status} onChange={set('status')} className={input}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-800 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold">
            {busy ? 'Saving…' : student ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Link RFID card ---------------- */

function LinkCardModal({ student, onClose, onNext }: { student: Student; onClose: () => void; onNext: (next: Student) => void }) {
  const [card, setCard] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [keepGoing, setKeepGoing] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // USB readers "type" into whatever has focus, so keep the input focused:
  // when a new student is shown, and again after every save attempt.
  useEffect(() => {
    setCard('');
    setError('');
  }, [student.id]);
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, student.id]);

  const save = async (rfid: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.message);

      if (!rfid) {
        onClose();
        return;
      }
      setSuccess(`Linked card ${rfid} to ${student.name}.`);
      if (keepGoing) {
        const next = await fetch('/api/students?card=unlinked').then(readJson);
        const nextStudent: Student | undefined = next.students?.find((s: Student) => s.id !== student.id);
        if (nextStudent) onNext(nextStudent);
        else setSuccess(`Linked card ${rfid} to ${student.name}. Every student now has a card.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link the card.');
      setCard('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Link RFID card" onClose={onClose}>
      <div className="space-y-4">
        {success && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</p>}

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-semibold text-gray-900">{student.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-mono">{student.studentId}</span> · {classLabel(student)}
          </p>
          {student.rfid && (
            <p className="text-sm text-gray-700 mt-1">
              Current card: <span className="font-mono">{student.rfid}</span>
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (card.trim()) save(card.trim());
          }}
          className="space-y-2"
        >
          <label htmlFor="rfid-input" className="block text-sm font-medium text-gray-700">
            Tap the student&apos;s card on the RFID reader
          </label>
          <input
            id="rfid-input"
            ref={inputRef}
            value={card}
            onChange={(e) => setCard(e.target.value)}
            readOnly={busy}
            autoComplete="off"
            placeholder="Waiting for card… (or type the number and press Enter)"
            className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl bg-white text-gray-900 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        {error && <ErrorText>{error}</ErrorText>}

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={keepGoing} onChange={(e) => setKeepGoing(e.target.checked)} className="h-4 w-4" />
          After linking, go to the next student without a card
        </label>

        <div className="flex justify-between gap-2 pt-2">
          {student.rfid ? (
            <button onClick={() => save('')} disabled={busy} className="px-4 py-2.5 text-red-700 hover:bg-red-50 rounded-xl font-semibold">
              Unlink card
            </button>
          ) : (
            <span />
          )}
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-800 hover:bg-gray-50">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
