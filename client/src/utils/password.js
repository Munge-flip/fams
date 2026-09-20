// Mirrors the password policy enforced by the server (server/controllers/authController.js).
export const passwordRequirements = (password) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: 'At least one uppercase letter' },
  { key: 'lower', label: 'At least one lowercase letter' },
  { key: 'number', label: 'At least one number' },
  { key: 'special', label: 'At least one special character' },
];

export const meetsPasswordRequirements = (password) => Object.values(passwordRequirements(password)).every(Boolean);
