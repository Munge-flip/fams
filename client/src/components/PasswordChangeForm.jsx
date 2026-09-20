import { useEffect, useState } from 'react';
import PasswordField from './PasswordField';
import { changePassword, confirmVerificationCode } from '../services/authService';
import { meetsPasswordRequirements } from '../utils/password';

const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10';
const buttonClass = 'min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass = 'min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60';

const requestError = (error, fallback) => error.response?.data?.message || fallback;

// Shared by the settings pages so password rules and messaging stay in one place. The change
// is two-step like an email change: the password is parked (hashed) server-side and only
// applied once the code sent to the account's own address comes back.
export default function PasswordChangeForm() {
  const [step, setStep] = useState('request');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setInterval(() => setCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const restart = () => {
    setStep('request');
    setCode('');
    setCooldown(0);
    setError('');
    setNotice('');
  };

  // Used by the first submit and by "Send a new code": both park the same three fields and
  // ask the server for a fresh code, so a resend can never introduce a different password.
  const requestChange = async () => {
    const response = await changePassword({ currentPassword, newPassword, confirmPassword });
    setNotice(response.data?.message || 'We sent a 6-digit code to your primary email.');
    setCooldown(response.data?.resendAfterSeconds || 0);
    setError('');
    setSuccess('');
    setStep('confirm');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Enter your current password to confirm this change.');
      return;
    }
    if (!newPassword) {
      setError('Enter your new password.');
      return;
    }
    if (!meetsPasswordRequirements(newPassword)) {
      setError('Your new password does not meet the minimum requirements listed above.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords you entered do not match.');
      return;
    }

    try {
      setSaving(true);
      await requestChange();
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to start the password change. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');

    try {
      setSaving(true);
      await requestChange();
    } catch (requestFailure) {
      // The parked password request re-proves the current password, so an outdated one here
      // means the form has to start over rather than keep a stale code step on screen.
      if (requestFailure.response?.status === 401) {
        restart();
        setError('Enter your current password again to send a new code.');
        return;
      }
      setError(requestError(requestFailure, 'Unable to send a new code. Please try again.'));
    } finally {
      setSaving(false);
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
      setSaving(true);
      const response = await confirmVerificationCode({ code: code.trim() });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(response.data?.message || 'Your password has been updated.');
      restart();
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to confirm the code. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5">
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{success}</p>}

      {step === 'request' ? (
        <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
          <label className={`${labelClass} sm:col-span-2`} htmlFor="settings-current-password">
            Current password
            <input
              autoComplete="current-password"
              className={inputClass}
              disabled={saving}
              id="settings-current-password"
              name="currentPassword"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <PasswordField
            disabled={saving}
            id="settings-new-password"
            label="New password"
            name="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            showRequirements
            value={newPassword}
          />
          <label className={labelClass} htmlFor="settings-confirm-password">
            Confirm new password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={saving}
              id="settings-confirm-password"
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={buttonClass} disabled={saving} type="submit">
              {saving ? 'Sending code…' : 'Send verification code'}
            </button>
            <p className="mt-2 text-sm text-gray-600">We will email a 6-digit code to your primary email address. Your password only changes once you enter it.</p>
          </div>
        </form>
      ) : (
        <form className="space-y-5" noValidate onSubmit={handleConfirm}>
          {notice && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{notice}</p>}
          <label className={labelClass} htmlFor="settings-password-code">
            Verification code
            <input
              autoComplete="one-time-code"
              className={inputClass}
              disabled={saving}
              id="settings-password-code"
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
            <button className={buttonClass} disabled={saving} type="submit">
              {saving ? 'Confirming…' : 'Confirm new password'}
            </button>
            <button className={secondaryButtonClass} disabled={saving || cooldown > 0} onClick={handleResend} type="button">
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </button>
            <button className={secondaryButtonClass} disabled={saving} onClick={restart} type="button">Use a different password</button>
          </div>
        </form>
      )}
    </div>
  );
}
