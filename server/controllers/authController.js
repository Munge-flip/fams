const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { clearedCookieOptions, cookieOptions } = require('../config/cookie');
const asyncHandler = require('../utils/asyncHandler');
const { createToken } = require('../utils/token');
const { validateEmailDomain, validateEmailFormat } = require('../utils/validation');

const allowedFields = [
  'name', 'email', 'password', 'role', 'studentID', 'course', 'yearLevel',
  'barangay', 'contactNo', 'aidCategory', 'office', 'adminLevel',
];

const updateableProfileFields = ['name', 'studentID', 'course', 'yearLevel', 'barangay', 'contactNo', 'aidCategory'];

// Single definition of the password policy, shared by registration and password changes.
const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return 'Password must be a string.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';

  return null;
};

const toSafeUser = (user) => {
  const { password, ...safeUser } = user.toObject();
  return safeUser;
};

// Only the Capacitor app asks for a body token. Web and admin requests omit the marker, so
// their response body keeps its existing shape and the JWT remains confined to the httpOnly
// cookie. The cookie is still set for native requests; the body token is what the WebView uses.
const isNativeClient = (req) => req.get('X-Client-Platform') === 'capacitor';

const sessionResponse = (req, res, status, user, token) => {
  const body = { success: true, data: toSafeUser(user) };

  if (isNativeClient(req)) {
    body.token = token;
  }

  return res.status(status).json(body);
};

const validateRegistration = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required.';
  }

  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    return `Unexpected field: ${unexpectedField}.`;
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return 'Name is required.';
  }

  const emailError = validateEmailFormat(body.email);
  if (emailError) {
    return emailError;
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return passwordError;
  }

  if (!['student', 'resident'].includes(body.role)) {
    return 'Role must be student or resident.';
  }

  if (body.studentID !== undefined && (typeof body.studentID !== 'string' || !body.studentID.trim())) {
    return 'Student ID must be a non-empty string when provided.';
  }

  if (body.yearLevel !== undefined && (!Number.isInteger(body.yearLevel) || body.yearLevel < 1)) {
    return 'Year level must be a positive whole number when provided.';
  }

  return null;
};

const register = asyncHandler(async (req, res) => {
  const validationError = validateRegistration(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  // Registration accepts only addresses that can actually receive mail, so the domain is
  // checked before the account exists.
  const domainError = await validateEmailDomain(req.body.email);
  if (domainError) {
    return res.status(400).json({ success: false, message: domainError });
  }

  const email = req.body.email.trim().toLowerCase();
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const studentID = req.body.studentID?.trim();
  if (studentID) {
    const existingStudent = await User.findOne({ role: 'student', studentID });
    if (existingStudent) {
      return res.status(409).json({ success: false, message: 'An account with this student ID already exists.' });
    }
  }

  const password = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({
    ...req.body,
    name: req.body.name.trim(),
    email,
    password,
    studentID,
  });

  // Registration is complete on its own: the account is active and signs in immediately, with
  // no email confirmation step and no dependency on mail delivery.
  const token = createToken(user);
  res.cookie('fams_token', token, cookieOptions());

  return sessionResponse(req, res, 201, user, token);
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Email or Student ID and password are required.' });
  }

  const normalizedIdentifier = identifier.trim();
  const matchingUsers = await User.find({
    $or: [
      { email: normalizedIdentifier.toLowerCase() },
      { role: 'student', studentID: normalizedIdentifier },
    ],
  }).select('+password').limit(2);

  if (matchingUsers.length > 1) {
    return res.status(400).json({ success: false, message: 'Email or Student ID is ambiguous. Contact an administrator.' });
  }

  const user = matchingUsers[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or student ID, or password.' });
  }

  const token = createToken(user);
  res.cookie('fams_token', token, cookieOptions());
  return sessionResponse(req, res, 200, user, token);
});

const logout = (req, res) => {
  res.clearCookie('fams_token', clearedCookieOptions(cookieOptions()));
  return res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
};

const me = (req, res) => res.status(200).json({ success: true, data: toSafeUser(req.user) });

const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'A JSON object is required.' });
  }

  const invalidField = Object.keys(body).find((field) => !updateableProfileFields.includes(field));
  if (invalidField) {
    return res.status(400).json({ success: false, message: `Cannot update field: ${invalidField}.` });
  }

  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  Object.keys(body).forEach((field) => {
    user[field] = body[field];
  });

  if (user.verificationStatus === 'needs_correction') {
    user.verificationStatus = 'pending';
    user.verificationRemarks = '';
  }

  await user.save();
  res.status(200).json({ success: true, data: toSafeUser(user) });
});

const verificationProfileFields = [
  'name', 'dateOfBirth', 'contactNo', 'address', 'barangay',
  'studentID', 'course', 'yearLevel', 'school', 'email',
  'father', 'mother', 'household',
];

const parentKeys = ['fullName', 'dob', 'contact', 'occupation', 'employmentStatus', 'monthlyIncomeRange'];
const householdKeys = ['memberCount', 'dependentsCount', 'currentlyStudyingCount', 'monthlyIncomeRange', 'primaryIncomeSource', 'secondaryIncomeSource'];
const employmentStatuses = ['employed', 'unemployed', 'working_abroad', 'unknown', 'deceased', 'na'];
const incomeRanges = ['Below ₱10,000', '₱10,000–₱19,999', '₱20,000–₱29,999', '₱30,000–₱39,999', '₱40,000 or more'];
const contactPattern = /^[+]?[\d\s()-]{7,15}$/;

const isNotFutureDate = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const validateVerificationPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required.';
  }

  const unexpectedField = Object.keys(body).find((field) => !verificationProfileFields.includes(field));
  if (unexpectedField) {
    return `Unexpected field: ${unexpectedField}.`;
  }

  const required = ['name', 'dateOfBirth', 'contactNo', 'address', 'barangay', 'studentID', 'course', 'yearLevel', 'school'];
  const missing = required.find((field) => !String(body[field] ?? '').trim());
  if (missing) {
    return 'Please provide all required personal and student information.';
  }

  if (!isNotFutureDate(body.dateOfBirth)) {
    return 'Date of birth must be a valid date and cannot be in the future.';
  }

  if (!Number.isInteger(Number(body.yearLevel)) || Number(body.yearLevel) < 1) {
    return 'Year level must be a positive whole number.';
  }

  if (!contactPattern.test(String(body.contactNo).trim())) {
    return 'Contact number looks invalid. Use digits only, optionally starting with +63.';
  }

  ['father', 'mother'].forEach((parentKey) => {
    const parent = body[parentKey];
    if (parent === undefined) return;
    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
      throw new Error(`${parentKey} must be an object.`);
    }
    const invalidKey = Object.keys(parent).find((key) => !parentKeys.includes(key));
    if (invalidKey) {
      throw new Error(`Unexpected field: ${parentKey}.${invalidKey}.`);
    }
    if (parent.employmentStatus !== undefined && parent.employmentStatus !== '' && !employmentStatuses.includes(parent.employmentStatus)) {
      throw new Error(`Invalid employment status for ${parentKey}.`);
    }
    if (parent.dob !== undefined && parent.dob !== null && parent.dob !== '' && !isNotFutureDate(parent.dob)) {
      throw new Error(`${parentKey}.dob must be a valid date and cannot be in the future.`);
    }
    if (parent.monthlyIncomeRange !== undefined && parent.monthlyIncomeRange !== '' && !incomeRanges.includes(parent.monthlyIncomeRange)) {
      throw new Error(`Invalid income range for ${parentKey}.`);
    }
  });

  const household = body.household;
  if (household !== undefined) {
    if (!household || typeof household !== 'object' || Array.isArray(household)) {
      throw new Error('household must be an object.');
    }
    const invalidKey = Object.keys(household).find((key) => !householdKeys.includes(key));
    if (invalidKey) {
      throw new Error(`Unexpected field: household.${invalidKey}.`);
    }
    if (household.memberCount !== undefined && (!Number.isInteger(Number(household.memberCount)) || Number(household.memberCount) < 1)) {
      throw new Error('Household member count must be a positive whole number.');
    }
    ['dependentsCount', 'currentlyStudyingCount'].forEach((field) => {
      if (household[field] !== undefined && (!Number.isInteger(Number(household[field])) || Number(household[field]) < 0)) {
        throw new Error(`${field} must be a non-negative whole number.`);
      }
    });
    if (household.monthlyIncomeRange !== undefined && household.monthlyIncomeRange !== '' && !incomeRanges.includes(household.monthlyIncomeRange)) {
      throw new Error('Invalid household income range.');
    }
  }

  return null;
};

const cleanParentFields = (parent) => {
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
    return {};
  }
  const cleaned = {};
  Object.keys(parent).forEach((key) => {
    if (parent[key] !== '') {
      cleaned[key] = parent[key];
    }
  });
  return cleaned;
};

const submitVerificationProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  let validationError;
  try {
    validationError = validateVerificationPayload(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { name, dateOfBirth, contactNo, address, barangay, studentID, course, yearLevel, school, father, mother, household } = req.body;

  user.name = String(name).trim();
  user.dateOfBirth = dateOfBirth;
  user.contactNo = String(contactNo).trim();
  user.address = String(address).trim();
  user.barangay = String(barangay).trim();
  user.studentID = String(studentID).trim();
  user.course = String(course).trim();
  user.yearLevel = Number(yearLevel);
  user.school = String(school).trim();
  user.father = cleanParentFields(father);
  user.mother = cleanParentFields(mother);
  user.household = household || {};

  if (user.verificationStatus === 'incomplete' || user.verificationStatus === 'needs_correction') {
    user.verificationStatus = 'pending';
    user.verificationRemarks = '';
  }

  await user.save();
  res.status(200).json({ success: true, data: toSafeUser(user) });
});

// Credential changes are confirmed with the current password only. They apply immediately:
// the deployed mail sandbox cannot deliver codes to arbitrary recipients, so a code step
// would strand every account that does not own the sender address.
//
// Shared body handling for anything that changes credentials.
const readRequestBody = (req, res, allowedFields) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ success: false, message: 'A JSON object is required.' });
    return null;
  }

  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    res.status(400).json({ success: false, message: `Unexpected field: ${unexpectedField}.` });
    return null;
  }

  return body;
};

const authorizePassword = async (req, res, allowedFields) => {
  const body = readRequestBody(req, res, allowedFields);
  if (!body) return null;

  if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
    res.status(400).json({ success: false, message: 'Enter your current password to confirm this change.' });
    return null;
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await bcrypt.compare(body.currentPassword, user.password))) {
    res.status(401).json({ success: false, message: 'Your current password is incorrect.' });
    return null;
  }

  return user;
};

const authorizeEmailChange = async (req, res) => {
  const body = readRequestBody(req, res, ['email', 'currentPassword']);
  if (!body) return null;

  const formatError = validateEmailFormat(body.email);
  if (formatError) {
    res.status(400).json({ success: false, message: formatError });
    return null;
  }

  const user = await authorizePassword(req, res, ['email', 'currentPassword']);
  if (!user) return null;

  // The new address has to be able to receive mail, so the domain is checked before the
  // change is applied, and only after the password proves this is the account owner.
  const domainError = await validateEmailDomain(body.email);
  if (domainError) {
    res.status(400).json({ success: false, message: domainError });
    return null;
  }

  return user;
};

// Applying a new primary address needs only the current password. Format and MX are still
// checked, but no code is sent and nothing is parked: the change lands on this request.
const changeEmail = asyncHandler(async (req, res) => {
  const user = await authorizeEmailChange(req, res);
  if (!user) return undefined;

  const email = req.body.email.trim().toLowerCase();
  if (email === user.email) {
    return res.status(400).json({ success: false, message: 'That is already your email address.' });
  }

  const existing = await User.findOne({ email, _id: { $ne: user._id } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'That email address is already used by another account.' });
  }

  user.email = email;
  await user.save();

  return res.status(200).json({
    success: true,
    data: { message: 'Your email address has been updated.', user: toSafeUser(user) },
  });
});

// Adding or replacing a recovery email uses the same current-password confirmation; neither
// variant sends a code.
const setRecoveryEmail = asyncHandler(async (req, res) => {
  const user = await authorizeEmailChange(req, res);
  if (!user) return undefined;

  const email = req.body.email.trim().toLowerCase();
  if (email === user.email) {
    return res.status(400).json({ success: false, message: 'Your recovery email must be different from your primary email address.' });
  }
  if (email === user.recoveryEmail) {
    return res.status(400).json({ success: false, message: 'That is already your recovery email address.' });
  }

  const message = user.recoveryEmail ? 'Recovery email updated.' : 'Recovery email added.';
  user.recoveryEmail = email;
  await user.save();

  return res.status(200).json({
    success: true,
    data: { message, recoveryEmail: email, user: toSafeUser(user) },
  });
});

// Clearing the recovery email protects nothing, so it only needs the current password.
const removeRecoveryEmail = asyncHandler(async (req, res) => {
  const user = await authorizePassword(req, res, ['currentPassword']);
  if (!user) return undefined;

  user.recoveryEmail = undefined;
  await user.save();

  return res.status(200).json({ success: true, data: { message: 'Recovery email removed.', user: toSafeUser(user) } });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await authorizePassword(req, res, ['currentPassword', 'newPassword', 'confirmPassword']);
  if (!user) return undefined;

  const { newPassword, confirmPassword } = req.body;

  if (typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({ success: false, message: 'Enter your new password.' });
  }

  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    return res.status(400).json({ success: false, message: 'The new passwords you entered do not match.' });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  return res.status(200).json({
    success: true,
    data: { message: 'Your password has been updated.', user: toSafeUser(user) },
  });
});

module.exports = {
  changeEmail,
  changePassword,
  register,
  login,
  logout,
  me,
  removeRecoveryEmail,
  setRecoveryEmail,
  updateProfile,
  submitVerificationProfile,
};

