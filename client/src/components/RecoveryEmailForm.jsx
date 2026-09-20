import { useState } from 'react';
import EmailChangeForm from './EmailChangeForm';
import { removeRecoveryEmail, setRecoveryEmail } from '../services/authService';

const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10';
const buttonClass = 'min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass = 'min-h-11 rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-60';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestError = (error, fallback) => error.response?.data?.message || fallback;

// A first recovery email only needs the current password; replacing one reuses the
// verification flow so the new address is proven reachable.
export default function RecoveryEmailForm({ recoveryEmail, onChanged }) {
  const [mode, setMode] = useState('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (typeof onChanged === 'function') {
      await onChanged();
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const target = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(target)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your current password to confirm this change.');
      return;
    }

    try {
      setBusy(true);
      const response = await setRecoveryEmail({ email: target, currentPassword: password });
      setEmail('');
      setPassword('');
      await reload();
      setSuccess(response.data?.message || 'Recovery email added.');
    } catch (failure) {
      setError(requestError(failure, 'Unable to save your recovery email. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Enter your current password to confirm this change.');
      return;
    }
    if (!window.confirm('Remove your recovery email? You will only be able to sign in with your primary email.')) {
      return;
    }

    try {
      setBusy(true);
      const response = await removeRecoveryEmail({ currentPassword: password });
      setPassword('');
      await reload();
      setSuccess(response.data?.message || 'Recovery email removed.');
    } catch (failure) {
      setError(requestError(failure, 'Unable to remove your recovery email. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'change' && recoveryEmail) {
    return (
      <div className="mt-4">
        <EmailChangeForm
          currentEmail={recoveryEmail}
          idPrefix="recovery-change"
          labels={{
            newEmail: 'New recovery email address',
            sendCode: 'Send verification code',
            confirm: 'Confirm new recovery email',
          }}
          onChanged={async () => {
            setMode('idle');
            await reload();
          }}
          requestChange={setRecoveryEmail}
        />
        <button className={`${secondaryButtonClass} mt-4`} disabled={busy} onClick={() => setMode('idle')} type="button">Cancel</button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      {recoveryEmail ? (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{recoveryEmail}</p>
            <p className="mt-1 text-sm text-gray-600">Saved as a backup for this account. It is not used to sign in.</p>
          </div>
          <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleRemove}>
            <label className={labelClass} htmlFor="recovery-email-password">
              Current password
              <input
                autoComplete="current-password"
                className={inputClass}
                disabled={busy}
                id="recovery-email-password"
                name="currentPassword"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
              <button className={buttonClass} disabled={busy} onClick={() => { setError(''); setSuccess(''); setMode('change'); }} type="button">
                Change recovery email
              </button>
              <button className={secondaryButtonClass} disabled={busy} type="submit">
                {busy ? 'Working…' : 'Remove recovery email'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleAdd}>
          <label className={`${labelClass} sm:col-span-2`} htmlFor="recovery-email-new">
            Recovery email address
            <input
              autoComplete="email"
              className={inputClass}
              disabled={busy}
              id="recovery-email-new"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="backup@example.com"
              type="email"
              value={email}
            />
          </label>
          <label className={labelClass} htmlFor="recovery-email-add-password">
            Current password
            <input
              autoComplete="current-password"
              className={inputClass}
              disabled={busy}
              id="recovery-email-add-password"
              name="currentPassword"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <div className="flex items-end">
            <button className={buttonClass} disabled={busy} type="submit">{busy ? 'Saving…' : 'Add recovery email'}</button>
          </div>
          <p className="text-sm text-gray-600 sm:col-span-2">No code is needed the first time. Changing it later verifies the new address.</p>
        </form>
      )}
    </div>
  );
}
