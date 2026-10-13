'use client';

import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, EmptyState, ErrorText, Field, inputClass, Modal, PageHeader, primaryButton, secondaryButton, SuccessText } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { MIN_PASSWORD_LENGTH, type toAccountJson } from '@/lib/accounts';

type Account = ReturnType<typeof toAccountJson> & { events: number; pendingRequests: number };

export default function AccountsPage() {
  const me = useCurrentUser('/');
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(
    () =>
      api<{ accounts: Account[] }>('/api/accounts')
        .then((d) => setAccounts(d.accounts))
        .catch((e) => setError((e as Error).message)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const orgs = accounts?.filter((a) => a.role === 'council') ?? [];
  const admins = accounts?.filter((a) => a.role === 'admin') ?? [];

  const row = (a: Account) => (
    <li key={a.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">{a.name}</h3>
          {a.status === 'disabled' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-700">Disabled</span>
          )}
          {a.id === me?.id && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">You</span>}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">
          Username: <span className="font-mono">{a.username}</span>
          {a.role === 'council' && (
            <>
              {' '}
              · {a.events} event{a.events === 1 ? '' : 's'}
              {a.pendingRequests > 0 && <> · {a.pendingRequests} pending request{a.pendingRequests === 1 ? '' : 's'}</>}
            </>
          )}
        </p>
        {a.createdAt && <p className="text-xs text-gray-500 mt-0.5">Created {formatDateTime(a.createdAt)}</p>}
      </div>
      <button onClick={() => setEditing(a)} className={`${secondaryButton} shrink-0`}>
        Manage
      </button>
    </li>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader
          title="Accounts"
          subtitle="Organization accounts request and run their own events; admins approve requests and manage everything"
          actions={
            <button onClick={() => setEditing('new')} className={`${primaryButton} w-full sm:w-auto`}>
              New Account
            </button>
          }
        />

        <div className="p-4 sm:p-8 space-y-6">
          {error && <ErrorText>{error}</ErrorText>}
          {notice && <SuccessText>{notice}</SuccessText>}

          {accounts && (
            <>
              <Card>
                <h2 className="px-4 sm:px-6 pt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Organizations</h2>
                {orgs.length === 0 ? (
                  <EmptyState title="No organization accounts yet">
                    Click <b>New Account</b> to create one for each org or student council. They log in at the council login page.
                  </EmptyState>
                ) : (
                  <ul className="divide-y divide-gray-100">{orgs.map(row)}</ul>
                )}
              </Card>
              <Card>
                <h2 className="px-4 sm:px-6 pt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Admins</h2>
                <ul className="divide-y divide-gray-100">{admins.map(row)}</ul>
              </Card>
            </>
          )}
        </div>
      </main>

      {editing && (
        <AccountModal
          account={editing === 'new' ? null : editing}
          isMe={editing !== 'new' && editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            load();
          }}
        />
      )}
    </div>
  );
}

function AccountModal({
  account,
  isMe,
  onClose,
  onSaved,
}: {
  account: Account | null;
  isMe: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'council' | 'admin'>(account?.role ?? 'council');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (extra: { status?: 'active' | 'disabled' } = {}) => {
    setBusy(true);
    setError('');
    try {
      if (account) {
        const body: Record<string, string> = { ...extra };
        if (name !== account.name) body.name = name;
        if (password) body.password = password;
        if (role !== account.role) body.role = role;
        await api(`/api/accounts/${account.id}`, { method: 'PATCH', json: body });
        onSaved(
          extra.status === 'disabled'
            ? `${account.name} is disabled and can no longer log in.`
            : extra.status === 'active'
              ? `${account.name} can log in again.`
              : `Saved ${name}.${password ? ' Give them the new password.' : ''}`
        );
      } else {
        await api('/api/accounts', { method: 'POST', json: { name, username, password, role } });
        onSaved(`Created ${name}. They can log in with the username "${username.trim().toLowerCase()}" and the password you set.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={account ? `Manage ${account.name}` : 'New account'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        <Field label={role === 'admin' ? 'Name' : 'Organization name'} hint="Shown on events, requests and the sidebar">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. CICT Student Council" />
        </Field>
        {account ? (
          <p className="text-sm text-gray-600">
            Username: <span className="font-mono">{account.username}</span>
          </p>
        ) : (
          <Field label="Username" hint="Used to log in. Letters, numbers, dots, dashes or underscores.">
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" className={inputClass} placeholder="e.g. cictsc" />
          </Field>
        )}
        <Field
          label={account ? 'New password' : 'Password'}
          hint={account ? `Leave blank to keep the current password. At least ${MIN_PASSWORD_LENGTH} characters.` : `At least ${MIN_PASSWORD_LENGTH} characters. Share it with the organization privately.`}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!account}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="Account type">
          <select value={role} onChange={(e) => setRole(e.target.value as 'council' | 'admin')} disabled={isMe} className={inputClass}>
            <option value="council">Organization: requests and runs its own events</option>
            <option value="admin">Admin: approves requests and manages everything</option>
          </select>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {account && !isMe ? (
            account.status === 'active' ? (
              <button type="button" disabled={busy} onClick={() => save({ status: 'disabled' })} className="px-4 py-2.5 text-red-700 hover:bg-red-50 font-semibold rounded-xl">
                Disable account
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => save({ status: 'active' })} className={secondaryButton}>
                Enable account
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? 'Saving…' : account ? 'Save' : 'Create account'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
