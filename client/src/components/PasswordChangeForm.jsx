import { useState } from 'react';
import PasswordField from './PasswordField';
import { changePassword } from '../services/authService';
import { meetsPasswordRequirements } from '../utils/password';

const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10';

const requestError = (error, fallback) => error.response?.data?.message || fallback;

// Shared by the settings pages so password rules and messaging stay in one place.
export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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
      const response = await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(response.data?.message || 'Changes saved successfully.');
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to update your password. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mt-5 grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
      {success && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 sm:col-span-2" role="status">{success}</p>}

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
        <button className="min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
          {saving ? 'Saving…' : 'Save password'}
        </button>
      </div>
    </form>
  );
}
