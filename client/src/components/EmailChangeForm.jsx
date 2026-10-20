import { useState } from 'react';
import { changeEmail } from '../services/authService';

// Single-step email change shared by the Settings page (primary and recovery email):
// the new address is applied on the request that confirms the current password.
const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100';
const buttonClass = 'min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestError = (error, fallback) => error.response?.data?.message || fallback;

export default function EmailChangeForm({ idPrefix = 'email-change', labels = {}, onChanged, submitChange = changeEmail }) {
  const copy = {
    newEmail: labels.newEmail || 'New email address',
    placeholder: labels.placeholder || 'you@example.com',
    submit: labels.submit || 'Save new email',
  };
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const target = email.trim().toLowerCase();
    if (!target) {
      setError('Enter the new email address.');
      return;
    }
    if (!emailPattern.test(target)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!currentPassword) {
      setError('Enter your current password to confirm this change.');
      return;
    }

    try {
      setBusy(true);
      const response = await submitChange({ email: target, currentPassword });
      setEmail('');
      setCurrentPassword('');
      await onChanged?.();
      setSuccess(response.data?.message || 'Your email address has been updated.');
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to update your email address. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
        <label className={labelClass} htmlFor={`${idPrefix}-new`}>
          {copy.newEmail}
          <input
            autoComplete="email"
            className={inputClass}
            disabled={busy}
            id={`${idPrefix}-new`}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.placeholder}
            type="email"
            value={email}
          />
        </label>
        <label className={labelClass} htmlFor={`${idPrefix}-password`}>
          Current password
          <input
            autoComplete="current-password"
            className={inputClass}
            disabled={busy}
            id={`${idPrefix}-password`}
            name="currentPassword"
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            value={currentPassword}
          />
        </label>
        <div className="sm:col-span-2">
          <button className={buttonClass} disabled={busy} type="submit">{busy ? 'Saving…' : copy.submit}</button>
        </div>
      </form>
    </div>
  );
}
