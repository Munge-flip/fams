const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const EmailVerification = require('../models/EmailVerification');
const User = require('../models/User');
const { clearedCookieOptions, cookieOptions, verificationCookieOptions } = require('../config/cookie');
const asyncHandler = require('../utils/asyncHandler');
const { createToken, createVerificationTicket } = require('../utils/token');
const { sendVerificationCode } = require('../utils/email');

const allowedFields = [
  'name', 'email', 'password', 'role', 'studentID', 'course', 'yearLevel',
  'barangay', 'contactNo', 'aidCategory', 'office', 'adminLevel',
];

const updateableProfileFields = ['name', 'studentID', 'course', 'yearLevel', 'barangay', 'contactNo', 'aidCategory'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) {
    return 'A valid email address is required.';
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
    // New beneficiaries must confirm their address before the actions that depend on it.
    emailVerified: false,
  });

  // The account cannot sign in until the address is confirmed, so registration hands over
  // the activation ticket instead of a session. The verification screen uses it to read the
  // pending code, resend it and confirm it; no other endpoint accepts it.
  res.cookie('fams_verify', createVerificationTicket(user), verificationCookieOptions());

  // Registration succeeds even when the mail cannot be sent: the verify screen offers a
  // resend, and the user never has to register again.
  const issued = await sendVerificationCodeFor({ user, target: 'registration', email: user.email });

  return res.status(201).json({
    success: true,
    data: {
      user: toSafeUser(user),
      emailVerification: issued.ok
        ? {
          sent: true,
          email: issued.email,
          expiresInMinutes: issued.expiresInMinutes,
          resendAfterSeconds: issued.resendAfterSeconds,
        }
        : { sent: false, email: user.email, message: issued.message },
    },
  });
});

// Resends the activation code. The address is always the account the activation ticket was
// issued to, so this can never be used to mail codes to arbitrary addresses.
const requestEmailVerification = asyncHandler(async (req, res) => {
  const user = req.user;

  const issued = await sendVerificationCodeFor({ user, target: 'registration', email: user.email });

  if (!issued.ok) {
    const data = issued.resendAfterSeconds ? { resendAfterSeconds: issued.resendAfterSeconds } : undefined;
    return res.status(issued.status).json({ success: false, message: issued.message, data });
  }

  return res.status(200).json({
    success: true,
    data: {
      message: `We sent a new 6-digit code to ${issued.email}.`,
      email: issued.email,
      expiresInMinutes: issued.expiresInMinutes,
      resendAfterSeconds: issued.resendAfterSeconds,
    },
  });
});

// Lets the verification screen report honestly whether a code is waiting and how long
// until another can be requested, including after a reload or a failed send. The address is
// echoed back so the screen can name it without trusting any client-side state.
const getEmailVerificationStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const data = { email: user.email, pending: false, deliveryFailed: false, resendAfterSeconds: 0 };

  const pending = await EmailVerification.findOne({ user: user._id, target: 'registration' });
  if (!pending) {
    return res.status(200).json({ success: true, data });
  }

  // A failed send is not a waiting code, and it never makes the user sit out the cooldown.
  if (pending.deliveryFailed) {
    return res.status(200).json({ success: true, data: { ...data, deliveryFailed: true } });
  }

  const waitedSeconds = (Date.now() - new Date(pending.sentAt).getTime()) / 1000;

  return res.status(200).json({
    success: true,
    data: {
      ...data,
      pending: true,
      resendAfterSeconds: Math.max(Math.ceil(EMAIL_CODE_RESEND_SECONDS - waitedSeconds), 0),
    },
  });
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

  // Beneficiaries must confirm their address before they can sign in, so an unconfirmed
  // account is refused outright instead of being handed a session. The refusal names the
  // reason and the address, and it hands over the activation ticket, so the client can send
  // the user straight to the verification step rather than to a dead-end error. Admins are
  // created without the emailVerified field and are never affected.
  if (user.role !== 'admin' && user.emailVerified === false) {
    res.cookie('fams_verify', createVerificationTicket(user), verificationCookieOptions());
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before signing in. We sent a 6-digit code to your inbox.',
      data: { code: 'email_unverified', email: user.email },
    });
  }

  const token = createToken(user);
  res.cookie('fams_token', token, cookieOptions());
  return res.status(200).json({ success: true, data: toSafeUser(user) });
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

// Email changes are confirmed with a short-lived code sent to the NEW address, so a
// mistyped or hijacked session cannot move the account somewhere the owner cannot reach.
// The same flow serves admins and beneficiaries, and both the primary and recovery email.
const EMAIL_CODE_TTL_MINUTES = 15;
const EMAIL_CODE_RESEND_SECONDS = 60;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

const generateVerificationCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

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

  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) {
    res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    return null;
  }

  const user = await authorizePassword(req, res, ['email', 'currentPassword']);
  if (!user) return null;

  // Activation codes and email-change codes share one pending record, but only a confirmed
  // account can sign in, so an activation code can never be waiting for this user.
  return user;
};

// Issues the code for a pending verification, whichever address it targets. Returns a
// result instead of writing the response so callers (registration, resend, email change)
// can shape their own payload with the same expiry, cooldown and delivery rules.
const sendVerificationCodeFor = async ({ user, target, email }) => {
  const pending = await EmailVerification.findOne({ user: user._id });
  // A failed delivery never costs the user a wait: there is no code in their inbox to sit out.
  if (pending && !pending.deliveryFailed) {
    const waitedSeconds = (Date.now() - new Date(pending.sentAt).getTime()) / 1000;
    if (waitedSeconds < EMAIL_CODE_RESEND_SECONDS) {
      const waitFor = Math.ceil(EMAIL_CODE_RESEND_SECONDS - waitedSeconds);
      return {
        ok: false,
        status: 429,
        message: `Please wait ${waitFor} seconds before requesting another code.`,
        resendAfterSeconds: waitFor,
      };
    }
  }

  const code = generateVerificationCode();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

  // One pending code per account: replacing the record invalidates any code sent before.
  await EmailVerification.findOneAndUpdate(
    { user: user._id },
    { user: user._id, target, pendingEmail: email, codeHash: await bcrypt.hash(code, 12), expiresAt, sentAt, attempts: 0, deliveryFailed: false },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  try {
    await sendVerificationCode({ to: email, code, expiresInMinutes: EMAIL_CODE_TTL_MINUTES });
  } catch (error) {
    console.error(`Unable to send the verification code: ${error.message}`);

    // Keep the attempt on record so the verification screen can say the send failed instead of
    // looking like nothing ever happened. The expiry is pulled back to the send time, so the
    // code that never arrived cannot be confirmed by anyone.
    await EmailVerification.updateOne(
      { user: user._id },
      { $set: { sentAt, expiresAt: sentAt, attempts: 0, deliveryFailed: true } },
    );

    return {
      ok: false,
      status: 503,
      message: 'We could not send the verification code right now. Please try again in a moment.',
    };
  }

  return {
    ok: true,
    email,
    target,
    expiresInMinutes: EMAIL_CODE_TTL_MINUTES,
    resendAfterSeconds: EMAIL_CODE_RESEND_SECONDS,
  };
};

// Shared by the two flows that send a code to the recovery address or the primary one.
const issueEmailChangeCode = async (req, res, { user, target, email }) => {
  const issued = await sendVerificationCodeFor({ user, target, email });

  if (!issued.ok) {
    const data = issued.resendAfterSeconds ? { resendAfterSeconds: issued.resendAfterSeconds } : undefined;
    return res.status(issued.status).json({ success: false, message: issued.message, data });
  }

  return res.status(200).json({
    success: true,
    data: {
      message: `We sent a 6-digit code to ${issued.email}. Enter it below to finish the change.`,
      email: issued.email,
      target: issued.target,
      expiresInMinutes: issued.expiresInMinutes,
      resendAfterSeconds: issued.resendAfterSeconds,
    },
  });
};

const requestEmailChange = asyncHandler(async (req, res) => {
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

  return issueEmailChangeCode(req, res, { user, target: 'email', email });
});

// A first recovery email is simply recorded (there is nothing to protect yet); changing an
// existing one goes through the same code flow so the new address is proven reachable.
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

  if (!user.recoveryEmail) {
    user.recoveryEmail = email;
    await user.save();
    return res.status(200).json({ success: true, data: { message: 'Recovery email added.', recoveryEmail: email, user: toSafeUser(user) } });
  }

  return issueEmailChangeCode(req, res, { user, target: 'recoveryEmail', email });
});

// Clearing the recovery email protects nothing, so it only needs the current password.
const removeRecoveryEmail = asyncHandler(async (req, res) => {
  const user = await authorizePassword(req, res, ['currentPassword']);
  if (!user) return undefined;

  user.recoveryEmail = undefined;
  await user.save();

  return res.status(200).json({ success: true, data: { message: 'Recovery email removed.', user: toSafeUser(user) } });
});

// Applies whichever pending code the account holds: activation, a new primary address, or
// a new recovery address.
const confirmVerificationCode = asyncHandler(async (req, res) => {
  const body = readRequestBody(req, res, ['code']);
  if (!body) return undefined;

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: 'Enter the 6-digit code from the email.' });
  }

  const user = await User.findById(req.user._id);
  const pending = await EmailVerification.findOne({ user: user._id });
  if (!pending) {
    return res.status(400).json({
      success: false,
      message: user.emailVerified === false
        ? 'There is no code waiting. Request a new one to activate your account.'
        : 'There is no email change waiting. Start again with the new address.',
    });
  }

  // A failed send leaves a deliberately dead record: there is no code to check, and the
  // record stays so the verification screen keeps explaining what happened.
  if (pending.deliveryFailed) {
    return res.status(400).json({
      success: false,
      message: `We could not send a code to ${pending.pendingEmail}. Send a new code to try again.`,
    });
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    await EmailVerification.deleteOne({ _id: pending._id });
    return res.status(400).json({ success: false, message: 'That code has expired. Request a new one to continue.' });
  }

  if (pending.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await EmailVerification.deleteOne({ _id: pending._id });
    return res.status(429).json({ success: false, message: 'Too many incorrect codes. Request a new one to continue.' });
  }

  if (!(await bcrypt.compare(code, pending.codeHash))) {
    pending.attempts += 1;
    await pending.save();
    return res.status(400).json({ success: false, message: 'That code is not correct. Check the email and try again.' });
  }

  if (pending.target === 'registration') {
    // The address on the account must still be the one that was coded.
    if (pending.pendingEmail !== user.email) {
      await EmailVerification.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: 'Your email address changed. Request a new code to activate your account.' });
    }

    user.emailVerified = true;
    await user.save();
    await EmailVerification.deleteOne({ _id: pending._id });
    // The account signs in from now on, so the activation ticket has done its job.
    res.clearCookie('fams_verify', clearedCookieOptions(verificationCookieOptions()));

    return res.status(200).json({ success: true, data: { message: 'Your email address is verified.', user: toSafeUser(user) } });
  }

  if (pending.target === 'recoveryEmail') {
    if (pending.pendingEmail === user.email) {
      await EmailVerification.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: 'Your recovery email must be different from your primary email address.' });
    }

    user.recoveryEmail = pending.pendingEmail;
    await user.save();
    await EmailVerification.deleteOne({ _id: pending._id });

    return res.status(200).json({ success: true, data: { message: 'Your recovery email has been updated.', user: toSafeUser(user) } });
  }

  const taken = await User.findOne({ email: pending.pendingEmail, _id: { $ne: user._id } });
  if (taken) {
    await EmailVerification.deleteOne({ _id: pending._id });
    return res.status(409).json({ success: false, message: 'That email address is already used by another account.' });
  }

  user.email = pending.pendingEmail;
  await user.save();
  await EmailVerification.deleteOne({ _id: pending._id });

  return res.status(200).json({ success: true, data: { message: 'Your email address has been updated.', user: toSafeUser(user) } });
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

  return res.status(200).json({ success: true, data: { message: 'Changes saved successfully.' } });
});

module.exports = {
  changePassword,
  confirmVerificationCode,
  getEmailVerificationStatus,
  register,
  login,
  logout,
  me,
  removeRecoveryEmail,
  requestEmailChange,
  requestEmailVerification,
  setRecoveryEmail,
  updateProfile,
  submitVerificationProfile,
};

