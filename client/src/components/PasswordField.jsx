import { useState } from 'react';
import { PASSWORD_RULES, passwordRequirements } from '../utils/password';

// Password field with live requirement checklist and strength meter. Shared by the
// registration form and the admin Account page, so the feedback — and the mirrored
// rules — cannot drift between the two.
export default function PasswordField({ autoComplete = 'new-password', disabled, id, label, name, onChange, showRequirements = false, value }) {
  const [show, setShow] = useState(false);
  const fieldId = id || name;

  const reqs = passwordRequirements(value);

  const score = Object.values(reqs).filter(Boolean).length;
  const strength = score === 0 ? 'None' : score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : 'Strong';
  const strengthColor = score === 0 ? 'bg-gray-200' : score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="block">
      <div className="flex items-center justify-between text-sm font-medium text-gray-900">
        <label htmlFor={fieldId}>{label}</label>
        <button type="button" className="text-xs text-gray-500 underline focus:outline-none" onClick={() => setShow(!show)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <input
        className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none transition focus:border-black focus:ring-2 focus:ring-black/15 disabled:bg-gray-100"
        id={fieldId}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
      />
      {showRequirements && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex-1 ${score >= i ? strengthColor : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-700">Password strength: {strength}</p>
          <ul className="text-xs space-y-1 mt-2 text-gray-600">
            {PASSWORD_RULES.map((rule) => (
              <li className={`flex gap-2 ${reqs[rule.key] ? 'text-green-700 font-semibold' : ''}`} key={rule.key}><span>{reqs[rule.key] ? '✓' : '○'}</span> <span>{rule.label}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
