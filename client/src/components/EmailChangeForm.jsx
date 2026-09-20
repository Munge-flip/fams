import { useEffect, useState } from 'react';
import { confirmVerificationCode, requestEmailChange } from '../services/authService';

// Two-step email change shared by the Settings page (primary and recovery email):
// request a code for the new address (confirmed with the current password), then enter
// the code that arrives there.
const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100';
const buttonClass = 'min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass = 'min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestError = (error, fallback) => error.response?.data?.message || fallback;

export default function EmailChangeForm({ currentEmail, idPrefix = 'email-change', labels = {}, onChanged, requestChange = requestEmailChange }) {
  const copy = {
    newEmail: labels.newEmail || 'New email address',
    placeholder: labels.placeholder || 'you@example.com',
    sendCode: labels.sendCode || 'Send verification code',
    confirm: labels.confirm || 'Confirm new email',
    different: labels.different || 'Use a different email',
  };
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setInterval(() => setCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const restart = () => {
    setStep('request');
    setCode('');
    setPendingEmail('');
    setCooldown(0);
    setError('');
    setNotice('');
  };

  const sendCode = async (targetEmail, password) => {
    const response = await requestChange({ email: targetEmail, currentPassword: password });
    setPendingEmail(response.data?.email || targetEmail);
    setCooldown(response.data?.resendAfterSeconds || 0);
    setNotice(response.data?.message || 'We sent a code to the new address.');
    setError('');
    setStep('confirm');
  };

  const handleRequest = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the new email address.');
      return;
    }
    if (!emailPattern.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!currentPassword) {
      setError('Enter your current password to confirm this change.');
      return;
    }

    try {
      setBusy(true);
      await sendCode(trimmed, currentPassword);
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to start the email change. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');

    try {
      setBusy(true);
      await sendCode(pendingEmail, currentPassword);
    } catch (requestFailure) {
      if (requestFailure.response?.status === 401) {
        restart();
        setError('Enter your current password again to send a new code.');
        return;
      }
      setError(requestError(requestFailure, 'Unable to send a new code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the email.');
      return;
    }

    try {
      setBusy(true);
      const response = await confirmVerificationCode({ code: code.trim() });
      await onChanged?.();
      setSuccess(response.data?.message || 'Your email address has been updated.');
      restart();
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to confirm the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      {step === 'request' ? (
        <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleRequest}>
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
            <button className={buttonClass} disabled={busy} type="submit">{busy ? 'Sending code…' : copy.sendCode}</button>
          </div>
        </form>
      ) : (
        <form className="space-y-5" noValidate onSubmit={handleConfirm}>
          {notice && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{notice}</p>}
          <label className={labelClass} htmlFor={`${idPrefix}-code`}>
            Verification code
            <input
              autoComplete="one-time-code"
              className={inputClass}
              disabled={busy}
              id={`${idPrefix}-code`}
              inputMode="numeric"
              maxLength={6}
              name="code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              pattern="[0-9]{6}"
              placeholder="6-digit code"
              type="text"
              value={code}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className={buttonClass} disabled={busy} type="submit">{busy ? 'Confirming…' : copy.confirm}</button>
            <button className={secondaryButtonClass} disabled={busy || cooldown > 0} onClick={handleResend} type="button">
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </button>
            <button className={secondaryButtonClass} disabled={busy} onClick={restart} type="button">{copy.different}</button>
          </div>
        </form>
      )}
    </div>
  );
}
