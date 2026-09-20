import { useState } from 'react';
import PasswordField from '../../components/PasswordField';
import { useAuth } from '../../context/AuthContext';
import { updateAccountEmail, updateAccountPassword } from '../../services/userService';
import { meetsPasswordRequirements } from '../../utils/password';

const labelClass = 'block text-sm font-semibold text-gray-800';
const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10';
const buttonClass = 'mt-5 min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
const sectionClass = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestError = (error, fallback) => error.response?.data?.message || fallback;

export default function AdminAccount() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveEmail = async (event) => {
    event.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Enter the new email address.');
      return;
    }
    if (!emailPattern.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (!emailPassword) {
      setEmailError('Enter your current password to confirm this change.');
      return;
    }

    try {
      setSavingEmail(true);
      const response = await updateAccountEmail({ email: trimmed, currentPassword: emailPassword });
      await refreshUser();
      setEmail('');
      setEmailPassword('');
      setEmailSuccess(response.data?.message || 'Changes saved successfully.');
    } catch (error) {
      setEmailError(requestError(error, 'Unable to update your email address. Please try again.'));
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Enter your current password to confirm this change.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Enter your new password.');
      return;
    }
    if (!meetsPasswordRequirements(newPassword)) {
      setPasswordError('Your new password does not meet the minimum requirements listed above.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords you entered do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      const response = await updateAccountPassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(response.data?.message || 'Changes saved successfully.');
    } catch (error) {
      setPasswordError(requestError(error, 'Unable to update your password. Please try again.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <section>
        <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">ADMINISTRATION</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Account</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Update the email address and password you use to sign in to the administrator portal.</p>
      </section>

      <section className={`mt-6 ${sectionClass}`} aria-labelledby="account-email-heading">
        <h2 className="text-lg font-bold text-black" id="account-email-heading">Email address</h2>
        <p className="mt-1 text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-800">{user?.email}</span>. Enter your current password to confirm a new email address.
        </p>

        {emailError && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{emailError}</p>}
        {emailSuccess && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{emailSuccess}</p>}

        <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={saveEmail} noValidate>
          <label className={labelClass} htmlFor="account-new-email">
            New email address
            <input
              autoComplete="email"
              className={inputClass}
              disabled={savingEmail}
              id="account-new-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. admin@fams.com"
              type="email"
              value={email}
            />
          </label>
          <label className={labelClass} htmlFor="account-email-password">
            Current password
            <input
              autoComplete="current-password"
              className={inputClass}
              disabled={savingEmail}
              id="account-email-password"
              name="currentPassword"
              onChange={(event) => setEmailPassword(event.target.value)}
              type="password"
              value={emailPassword}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={buttonClass} disabled={savingEmail} type="submit">{savingEmail ? 'Saving…' : 'Save email address'}</button>
          </div>
        </form>
      </section>

      <section className={`mt-6 ${sectionClass}`} aria-labelledby="account-password-heading">
        <h2 className="text-lg font-bold text-black" id="account-password-heading">Password</h2>
        <p className="mt-1 text-sm text-gray-600">Choose a new password. You stay signed in on this device after saving.</p>

        {passwordError && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{passwordError}</p>}
        {passwordSuccess && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{passwordSuccess}</p>}

        <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={savePassword} noValidate>
          <label className={`${labelClass} sm:col-span-2`} htmlFor="account-current-password">
            Current password
            <input
              autoComplete="current-password"
              className={inputClass}
              disabled={savingPassword}
              id="account-current-password"
              name="currentPassword"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <PasswordField
            disabled={savingPassword}
            id="account-new-password"
            label="New password"
            name="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            showRequirements
            value={newPassword}
          />
          <label className={labelClass} htmlFor="account-confirm-password">
            Confirm new password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={savingPassword}
              id="account-confirm-password"
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={buttonClass} disabled={savingPassword} type="submit">{savingPassword ? 'Saving…' : 'Save password'}</button>
          </div>
        </form>
      </section>
    </>
  );
}
