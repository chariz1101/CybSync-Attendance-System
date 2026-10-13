'use client';

import { useEffect, useRef } from 'react';

/** Page title bar used by the dashboard pages. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="ml-12 lg:ml-0 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm sm:text-base text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 w-full sm:w-auto">{actions}</div>}
      </div>
    </header>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move keyboard focus into the dialog when it opens (unless something inside
  // already took it), and give it back to whatever opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto focus:outline-none`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      {children}
    </p>
  );
}

export function SuccessText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{children}</p>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <p className="text-base font-medium text-gray-700">{title}</p>
      {children && <div className="text-sm text-gray-500 mt-1">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-500';
export const primaryButton =
  'px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors';
export const secondaryButton =
  'px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 font-semibold rounded-xl transition-colors';

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'on-time': 'bg-green-100 text-green-800',
    late: 'bg-red-100 text-red-800',
    excused: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    upcoming: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    past: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    'on-time': 'On Time',
    late: 'Late',
    excused: 'Excused',
    pending: 'Pending',
    resolved: 'Accepted',
    approved: 'Approved',
    rejected: 'Rejected',
    upcoming: 'Upcoming',
    active: 'Running',
    past: 'Ended',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}
